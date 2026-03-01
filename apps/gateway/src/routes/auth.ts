import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/client";
import { z } from "zod";
import { authenticate } from "../middleware/auth";

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
    // POST /auth/register
    app.post("/register", async (req: FastifyRequest, reply: FastifyReply) => {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success)
            return reply.code(400).send({ error: parsed.error.flatten() });

        const { name, email, password } = parsed.data;
        const db = getDb();

        const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length)
            return reply.code(409).send({ error: "Email already registered" });

        const hashed = await bcrypt.hash(password, 12);
        const id = uuidv4();
        await db.query(
            "INSERT INTO users (id, name, email, password) VALUES ($1,$2,$3,$4)",
            [id, name, email, hashed]
        );

        const token = app.jwt.sign({ id, email });
        return reply.code(201).send({ token, user: { id, name, email } });
    });

    // POST /auth/login
    app.post("/login", async (req: FastifyRequest, reply: FastifyReply) => {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success)
            return reply.code(400).send({ error: parsed.error.flatten() });

        const { email, password } = parsed.data;
        const db = getDb();

        const result = await db.query(
            "SELECT id, name, email, password FROM users WHERE email = $1",
            [email]
        );
        const user = result.rows[0];
        if (!user) return reply.code(401).send({ error: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return reply.code(401).send({ error: "Invalid credentials" });

        const token = app.jwt.sign({ id: user.id, email: user.email });
        return reply.send({ token, user: { id: user.id, name: user.name, email: user.email } });
    });

    // GET /auth/me
    app.get(
        "/me",
        { preHandler: [authenticate] },
        async (req: FastifyRequest, reply: FastifyReply) => {
            const db = getDb();
            const result = await db.query(
                "SELECT id, name, email, created_at FROM users WHERE id = $1",
                [(req.user as { id: string }).id]
            );
            return reply.send(result.rows[0]);
        }
    );
}
