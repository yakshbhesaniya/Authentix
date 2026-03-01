import { FastifyRequest, FastifyReply } from "fastify";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { id: string; email: string };
        user: { id: string; email: string };
    }
}

export async function authenticate(
    req: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        await req.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: "Unauthorised — invalid or expired token" });
    }
}
