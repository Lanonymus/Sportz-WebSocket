import { WebSocketServer, WebSocket } from "ws"
import { Server } from "http"
import { wsArcjet } from "@/arcjet"



//  function helpers - żeby potem pomogły z redundencją kodu przy weryfikowaniu kod
function sendJson(socket: WebSocket, payload: any) {
    if (socket.readyState !== WebSocket.OPEN) return
    
    return socket.send(JSON.stringify(payload))
}

function broadcast(wss: WebSocketServer, payload: any) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue
        
        client.send(JSON.stringify(payload))
    }
}


interface CustomWebSocket extends WebSocket {
    isAlive: boolean
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
                socket.write(Buffer.from([0x88, 0x02, 0x03, 0xF3])) // 1011 close frame
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

        sendJson(customSocket, { type: "WELCOME"})
        customSocket.on('error', console.error)
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

    function broadcastMatchCreated(match: any) {
        broadcast(wss, { type: "MATCH_CREATED", data: match})
    }

    return { broadcastMatchCreated }
}

