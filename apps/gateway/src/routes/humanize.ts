import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getDb } from "../db/client";
import { enqueueJob } from "../queue/producer";
import { authenticate } from "../middleware/auth";

const humanizeSchema = z.object({
    text: z.string().min(10).max(100000),
});

export async function humanizeRoutes(app: FastifyInstance) {
    app.post(
        "/",
        { preHandler: [authenticate] },
        async (req: FastifyRequest, reply: FastifyReply) => {
            const user = req.user as { id: string };
            const parsed = humanizeSchema.safeParse(req.body);
            if (!parsed.success)
                return reply.code(400).send({ error: parsed.error.flatten() });

            const { text } = parsed.data;
            const jobId = uuidv4();
            const db = getDb();

            await db.query(
                "INSERT INTO jobs (id, user_id, type, status, input_text) VALUES ($1,$2,'humanize','queued',$3)",
                [jobId, user.id, text]
            );

            await enqueueJob({ jobId, userId: user.id, type: "humanize", text });

            return reply.code(202).send({ jobId, status: "queued", message: "Humanization started" });
        }
    );
}
