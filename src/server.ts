import { db } from "./db/db.ts"
import { messageObj } from "./db/schema.ts"
import { eq } from "drizzle-orm"
import express from "express"
import cors from "cors"

const app = express()
const PORT = 8000

app.use(cors)
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Hello from server")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

await db.delete(messageObj)
    .where(eq(messageObj.senderId, "kuba"))

// await db.insert(messageObj).values({
//     senderId: "kuba",
//     message: "haha xd"
// })

// await db.insert(messageObj).values({
//     senderId: "adam",
//     message: "no nie"
// })


// const allInfo = await db.select().from(messageObj)
// const wiadomosciKuby = await db.select()
//   .from(messageObj)
//   .where(eq(messageObj.senderId, "kuba"));

// console.log(wiadomosciKuby);




