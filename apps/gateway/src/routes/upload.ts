import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import * as Minio from "minio";
import { getDb } from "../db/client";
import { enqueueJob } from "../queue/producer";
import { authenticate } from "../middleware/auth";

const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
];

let minioClient: Minio.Client;

function getMinio() {
    if (!minioClient) {
        minioClient = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || "localhost",
            port: parseInt(process.env.MINIO_PORT || "9000"),
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY || "authentix",
            secretKey: process.env.MINIO_SECRET_KEY || "authentix_secret",
        });
    }
    return minioClient;
}

export async function uploadRoutes(app: FastifyInstance) {
    // Ensure bucket exists
    const bucket = process.env.MINIO_BUCKET || "authentix-documents";

    app.post(
        "/",
        { preHandler: [authenticate] },
        async (req: FastifyRequest, reply: FastifyReply) => {
            const user = req.user as { id: string };
            const data = await req.file();
            if (!data)
                return reply.code(400).send({ error: "No file uploaded" });

            if (!ALLOWED_TYPES.includes(data.mimetype))
                return reply
                    .code(415)
                    .send({ error: "Unsupported file type. Only PDF, DOC, DOCX, and TXT are allowed." });

            const minio = getMinio();
            const fileKey = `${user.id}/${uuidv4()}/${data.filename}`;

            // Ensure bucket
            const exists = await minio.bucketExists(bucket);
            if (!exists) await minio.makeBucket(bucket, "us-east-1");

            // Upload to MinIO
            const buffer = await data.toBuffer();
            await minio.putObject(bucket, fileKey, buffer, buffer.length, {
                "Content-Type": data.mimetype,
            });

            // Create job
            const jobId = uuidv4();
            const db = getDb();
            await db.query(
                "INSERT INTO jobs (id, user_id, type, status, file_key, file_name, file_type) VALUES ($1,$2,'full_report','queued',$3,$4,$5)",
                [jobId, user.id, fileKey, data.filename, data.mimetype]
            );

            await enqueueJob({
                jobId,
                userId: user.id,
                type: "full_report",
                fileKey,
                fileType: data.mimetype,
            });

            return reply.code(202).send({
                jobId,
                status: "queued",
                fileName: data.filename,
                message: "File uploaded and full pipeline analysis started",
            });
        }
    );
}
