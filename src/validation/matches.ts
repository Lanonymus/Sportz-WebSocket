import { z } from "zod"

export const MATCH_STATUS = {
    SCHEDULED: "scheduled",
    LIVE: "live",
    FINISHED: "finished"
}

export const listMatchesQuerySchema = z.object({
    limit: z.coerce.number().positive().max(100).optional()
})

const isoDateString = z.iso.datetime()

// refined system to check if dates are correct TODO:
// as well as endTime being after startTime

export const matchIdParamSchema = z.object({
    id: z.coerce.number().positive(),
    startTime: z.coerce.string(),
    endTime: z.coerce.string(),
    homeScore: z.coerce.number().nonnegative().optional(),
    awayScore: z.coerce.number().nonnegative().optional()
})

export const createMatchSchema = z.object({
    sport: z.string().min(1),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
    }).superRefine((data, ctx) => {
        const start = new Date(data.startTime)
        const end = new Date(data.endTime)
        if (end <= start) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "endTime must be chronologically after startTime",
                path: ["endTime"]
            })
        }

        if (data.homeTeam.toLowerCase() === data.awayTeam.toLowerCase()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Cannot have 2 of the same teams play against each other",
                path: ["awayTeam"]
            })
        }
})

export const updateScoreSchema = z.object({
    homeScore: z.coerce.number().int().nonnegative(),
    awayScore: z.coerce.number().int().nonnegative(),
})

