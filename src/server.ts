import express from "express"
import cors from "cors"
import { matchRouter } from "./routes/matches"

const app = express()
const PORT = 8000

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    return res.json({ message: "sup broski"})
})

app.use("/matches", matchRouter)



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})






