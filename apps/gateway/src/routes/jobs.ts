import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../db/client";
import { authenticate } from "../middleware/auth";

export async function jobRoutes(app: FastifyInstance) {
    // GET /jobs/:id — poll job status + results
    app.get<{ Params: { id: string } }>(
        "/:id",
        { preHandler: [authenticate] },
        async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const user = req.user as { id: string };
            const { id } = req.params;
            const db = getDb();

            const jobResult = await db.query(
                "SELECT id, type, status, progress, error, created_at, updated_at FROM jobs WHERE id = $1 AND user_id = $2",
                [id, user.id]
            );
            if (!jobResult.rows.length)
                return reply.code(404).send({ error: "Job not found" });

            const job = jobResult.rows[0];

            let results = null;
            if (job.status === "completed") {
                const resResult = await db.query(
                    "SELECT * FROM analysis_results WHERE job_id = $1",
                    [id]
                );
                results = resResult.rows[0] || null;
            }

            return reply.send({ job, results });
        }
    );

    // GET /jobs — list user's jobs
    app.get(
        "/",
        { preHandler: [authenticate] },
        async (req: FastifyRequest, reply: FastifyReply) => {
            const user = req.user as { id: string };
            const db = getDb();

            const result = await db.query(
                "SELECT id, type, status, progress, file_name, created_at, updated_at FROM jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
                [user.id]
            );
            return reply.send({ jobs: result.rows });
        }
    );
}
