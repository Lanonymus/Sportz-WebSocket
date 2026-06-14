import { db } from "@/db/db";
import { commentary } from "@/db/schema";
import { createCommentarySchema, listCommentaryQuerySchema } from "@/validation/commentary";
import { matchIdParamSchema } from "@/validation/matches";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { Request, Response } from "express";

export const commentaryRouter = Router({ mergeParams: true  });

const MAX_LIMIT = 100

commentaryRouter.get("/", async (req: Request, res: Response) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params)

    if(!paramsResult.success) {
        return res.status(400).json({ error: "Invalid match ID", issues: paramsResult.error.issues})
    }

    const parsedLimit = listCommentaryQuerySchema.safeParse(req.query)

    if(!parsedLimit.success) {
        return res.status(400).json({ error: "Invalid limit", issues: parsedLimit.error.issues })

    }

    const matchId  = paramsResult.data.id
    const safeLimit = Math.min(parsedLimit.data.limit ?? 50, MAX_LIMIT)

    try {
        const results = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(safeLimit)
        
        return res.status(200).json({ data: results})
    } catch (e) {
        console.error("Error fetching commentary for match ID:", e)
        return res.status(500).json({ error: "Error fetching commentary for match ID.", issues: e})

    }

})

commentaryRouter.post("/", async (req: Request, res: Response) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params)

    if (!paramsResult.success) {
        return res.status(400).json({ error: "Invalid match ID", issues: paramsResult.error.issues})

    }

    const bodyResult = createCommentarySchema.safeParse(req.body)

    if (!bodyResult.success) {
        return res.status(400).json({ error: "Invalid match data", issues: bodyResult.error.issues})
    }

    const { minutes, ...rest } = bodyResult.data

    try {
        const [result] = await db.insert(commentary).values({
            matchId: Number(paramsResult.data.id),
            minutes: minutes,
            ...rest
        }).returning()

        // udostepniam wszystkim dane o nowym komentarzu którzy subskrybują akurat do tego
        if (res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(result.matchId, result)
        }
        
        return res.status(200).json({ data: result})
    } catch (e) {
        console.error("Error creating commentary", e)
        return res.status(500).json({ error: "Internal server error", issues: e })

    }

})