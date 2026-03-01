import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyMultipart from "@fastify/multipart";
import { authRoutes } from "./routes/auth";
import { analyzeRoutes } from "./routes/analyze";
import { humanizeRoutes } from "./routes/humanize";
import { fullReportRoutes } from "./routes/fullReport";
import { uploadRoutes } from "./routes/upload";
import { jobRoutes } from "./routes/jobs";
import { initRedis } from "./queue/redis";
import { initDb } from "./db/client";
import { startWorker } from "./queue/worker";

const PORT = parseInt(process.env.PORT || "4000");
const HOST = "0.0.0.0";

export const app = Fastify({
    logger: {
        transport:
            process.env.NODE_ENV === "development"
                ? { target: "pino-pretty", options: { colorize: true } }
                : undefined,
    },
});

async function bootstrap() {
    // ─── Plugins ─────────────────────────────────────────────────────
    await app.register(fastifyCors, {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
    });

    await app.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || "dev_secret_change_me",
    });

    await app.register(fastifyRateLimit, {
        max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
        timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
    });

    await app.register(fastifyMultipart, {
        limits: {
            fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || "50") * 1024 * 1024,
        },
    });

    // ─── Health check ─────────────────────────────────────────────────
    app.get("/health", async () => ({ status: "ok", version: "1.0.0" }));

    // ─── Routes ───────────────────────────────────────────────────────
    await app.register(authRoutes, { prefix: "/auth" });
    await app.register(analyzeRoutes, { prefix: "/analyze" });
    await app.register(humanizeRoutes, { prefix: "/humanize" });
    await app.register(fullReportRoutes, { prefix: "/full-report" });
    await app.register(uploadRoutes, { prefix: "/upload" });
    await app.register(jobRoutes, { prefix: "/jobs" });

    // ─── Init services ────────────────────────────────────────────────
    await initDb();
    await initRedis();
    await startWorker();

    // ─── Start ────────────────────────────────────────────────────────
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Authentix Gateway running on http://${HOST}:${PORT}`);
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
