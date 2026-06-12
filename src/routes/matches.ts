import { db } from "@/db/db";
import { matches } from "@/db/schema";
import { createMatchSchema, listMatchesQuerySchema } from "@/validation/matches";
import { desc } from "drizzle-orm";
import { Router } from "express"
import type { Response, Request } from "express";

export const matchRouter = Router();

const MAX_LIMIT = 100

matchRouter.get("/", async (req: Request, res: Response) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query)

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query", details: parsed.error.issues})
    }
    const limit = Math.min(parsed.data.limit ?? 50 , MAX_LIMIT)
    try {
        const data = await db
            .select()
            .from(matches)
            .orderBy(desc(matches.createdAt))
            .limit(limit) 
        return res.status(200).json({ data })
    } catch (e) {
        return res.status(500).json({ error: "couldn't load data", details: e})
    }
})

matchRouter.post("/", async (req: Request, res: Response) => {
    const parsed = createMatchSchema.safeParse(req.body)

    if (!parsed.success) {
        res.status(400).json({ error: `Invalid payload`, details: parsed.error.issues})
        return
    }

    const { homeScore, awayScore, startTime, endTime } = parsed.data

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0
        }).returning();

        return res.status(201).json({ data: event})
    } catch (e) {
        return res.status(500).json({ error: `error while sending data to database: ${e}` })
    }
})