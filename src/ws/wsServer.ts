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
    const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 1024 * 1024})

    wss.on("connection", async (socket, req) => {
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req)
                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008
                    const reason = decision.reason.isRateLimit() ? "Exceeded maximum amount of requests" : "Access denied"

                    socket.close(code, reason)
                    return
                }
            } catch (e) {
                console.error("WS error connection: ", e)
                socket.close(1011, "Try later, server security problem")
                return
            }
        }

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

