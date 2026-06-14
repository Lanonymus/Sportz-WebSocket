import { WebSocketServer, WebSocket } from "ws"
import { Server } from "http"
import { wsArcjet } from "@/arcjet"

interface CustomWebSocket extends WebSocket {
    isAlive: boolean,
    subscriptions: Set<number>
}
const matchSubscribes = new Map()

function subscribe(matchId: number, socket: CustomWebSocket) {
    if(!matchSubscribes.has(matchId)) {
        matchSubscribes.set(matchId, new Set())
    }

    matchSubscribes.get(matchId).add(socket)
}

function unsubscribe(matchId: number, socket: CustomWebSocket) {
    const subscribers = matchSubscribes.get(matchId)

    if(!subscribers) return

    // usuwamy subskrajbera
    subscribers.delete(socket)

    // usuwamy puste szuflade na subskrajbery
    if(subscribers.size === 0) {
        matchSubscribes.delete(matchId)
    }

}

function cleanupSubscriptions(socket: CustomWebSocket) {
    for( const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket)
    }
}

function broadcastToMatch(matchId: number, payload: any) {
    const subscribers = matchSubscribes.get(matchId)

    if(!subscribers || subscribers.size === 0) return

    const message = JSON.stringify(payload)

    for(const client of subscribers) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    }
}

function handleMessage(socket: CustomWebSocket, data: any) {
    let message;

    try {
        message = JSON.parse(data.toString())
    } catch(e) {
        console.error("Invalid JSON message")
        return socket.send("Invalid JSON message")
    }

    if(message?.type === "subscribe" && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket)
        socket.subscriptions.add(message.matchId)
        sendJson(socket, { type: "subscribed",  matchId: message.matchId})
        return
    }

    if(message?.type === "unsubscribe"  && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket)
        socket.subscriptions.delete(message.matchId)
        sendJson(socket, { type: "unsubscribed",  matchId: message.matchId})
        return
    }

}


//  function helpers - żeby potem pomogły z redundencją kodu przy weryfikowaniu kod
function sendJson(socket: CustomWebSocket, payload: any) {
    if (socket.readyState !== WebSocket.OPEN) return
    
    return socket.send(JSON.stringify(payload))
}
function broadcastToAll(wss: WebSocketServer, payload: any) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue
        
        client.send(JSON.stringify(payload))
    }
}



export function attachWebSocketServer(server: Server) {
    const wss = new WebSocketServer({ noServer: true, path: "/ws", maxPayload: 1024 * 1024})

    // Handle upgrade at HTTP level before WebSocket handshake completes
    server.on('upgrade', async (req, socket, head) => {
        // Only intercept WebSocket upgrade requests
        if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
            socket.destroy()
            return
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req)
                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008

                    // Send WebSocket close frame before closing the socket
                    const closeFrame = Buffer.alloc(2)
                    closeFrame.writeUInt16BE(code, 0)
                    socket.write(Buffer.concat([Buffer.from([0x88, 0x02]), closeFrame]))
                    socket.end()
                    return
                }
            } catch (e) {
                console.error("WS error upgrade: ", e)
                socket.write(Buffer.from([0x88, 0x02, 0x03, 0xF3])) // 1011 close frałłme
                socket.end()
                return
            }
        }

        // Only proceed with upgrade if allowed
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req)
        })
    })

    wss.on("connection", (socket) => {
        const customSocket = socket as CustomWebSocket
        customSocket.isAlive = true
        customSocket.on("pong", () => { customSocket.isAlive = true})

        customSocket.subscriptions = new Set();

        sendJson(customSocket, { type: "WELCOME"})

        // event handlers

        customSocket.on("message", (data) => {
            handleMessage(customSocket, data)
        })

        customSocket.on("error", () => {
            socket.terminate()
        })

        customSocket.on("close", () => {
            cleanupSubscriptions(customSocket)
        })

    })

    const interval = setInterval(() => {
        wss.clients.forEach((client) => {
            const customSocket = client as CustomWebSocket
            if (customSocket.isAlive == false) return customSocket.terminate()
            
            customSocket.isAlive = false
            customSocket.ping()
        })
    }, 30_000)

    wss.on("close", () => clearInterval(interval))

    // udostępnianie do wszystkich klientów
    function broadcastMatchCreated(match: any) {
        broadcastToAll(wss, { type: "MATCH_CREATED", data: match})
    }

    // udostępnianie do poszczególnych klientów
    function broadcastCommentary(matchId: number, comment: any) {
        broadcastToMatch(matchId, { type: "commentary", data: comment})
    }

    return { broadcastMatchCreated, broadcastCommentary }
}

