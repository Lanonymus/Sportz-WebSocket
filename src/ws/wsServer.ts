import { WebSocketServer, WebSocket } from "ws"
import { Server } from "http"

//  function helpers - żeby potem pomogły z redundencją kodu przy weryfikowaniu kod
function sendJson(socket: WebSocket, payload: any) {
    if (socket.readyState !== WebSocket.OPEN) return
    
    return socket.send(JSON.stringify(payload))
}

function broadcast(wss: WebSocketServer, payload: any) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) return
        
        client.send(JSON.stringify(payload))
    }
}

// /https://ws/localhost:8000

export function attachWebSocketServer(server: Server) {
    const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 1024 * 1024})

    wss.on("connection", (socket) => {
        sendJson(socket, { type: "WELCOME"})

        socket.on('error', console.error)
    })

    function broadcastMatchCreated(match: any) {
        broadcast(wss, { type: "MATCH_CREATED", data: match})
    }

    return { broadcastMatchCreated }
}

