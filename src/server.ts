import express from "express"
import cors from "cors"
import { matchRouter } from "./routes/matches"
import dotenv from "dotenv"
import http from "http"
import { attachWebSocketServer } from "./ws/wsServer"

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = Number(process.env.PORT || 8000)
const HOST = process.env.HOST || "127.0.0.1"

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    return res.json({ message: "sup broski"})
})

app.use("/matches", matchRouter)

const { broadcastMatchCreated } = attachWebSocketServer(server)
app.locals.broadcastMatchCreated = broadcastMatchCreated

server.listen(PORT, HOST, () => {
    const baseUrl = HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`

    console.log("server is running on:", baseUrl)
    console.log("webscoket is running on:", `${baseUrl.replace("http", "ws")}/ws`)

})






