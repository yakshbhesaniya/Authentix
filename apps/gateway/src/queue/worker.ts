import { Worker, Job } from "bullmq";
import axios from "axios";
import { getRedis } from "./redis";
import { getDb } from "../db/client";

type ServiceData = Record<string, unknown>;

async function updateJob(
    jobId: string,
    status: string,
    progress: number,
    data?: Record<string, unknown>
) {
    const db = getDb();
    await db.query(
        "UPDATE jobs SET status = $1, progress = $2, updated_at = NOW() WHERE id = $3",
        [status, progress, jobId]
    );
    if (data && status === "completed") {
        await db.query(
            `INSERT INTO analysis_results (job_id, plagiarism_score, plagiarism_report, ai_score,
        ai_confidence_low, ai_confidence_high, ai_signals, humanized_text, humanize_validation, raw_ingestion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (job_id) DO UPDATE SET
         plagiarism_score = EXCLUDED.plagiarism_score,
         plagiarism_report = EXCLUDED.plagiarism_report,
         ai_score = EXCLUDED.ai_score,
         ai_confidence_low = EXCLUDED.ai_confidence_low,
         ai_confidence_high = EXCLUDED.ai_confidence_high,
         ai_signals = EXCLUDED.ai_signals,
         humanized_text = EXCLUDED.humanized_text,
         humanize_validation = EXCLUDED.humanize_validation,
         raw_ingestion = EXCLUDED.raw_ingestion`,
            [
                jobId,
                data.plagiarism_score ?? null,
                data.plagiarism_report ? JSON.stringify(data.plagiarism_report) : null,
                data.ai_score ?? null,
                data.ai_confidence_low ?? null,
                data.ai_confidence_high ?? null,
                data.ai_signals ? JSON.stringify(data.ai_signals) : null,
                data.humanized_text ?? null,
                data.humanize_validation ? JSON.stringify(data.humanize_validation) : null,
                data.raw_ingestion ? JSON.stringify(data.raw_ingestion) : null,
            ]
        );
    }
}

export async function startWorker() {
    const INGESTION_URL = process.env.INGESTION_URL || "http://localhost:8001";
    const PLAGIARISM_URL = process.env.PLAGIARISM_URL || "http://localhost:8002";
    const AI_DETECTION_URL = process.env.AI_DETECTION_URL || "http://localhost:8003";
    const HUMANIZER_URL = process.env.HUMANIZER_URL || "http://localhost:8004";

    new Worker(
        "analyze",
        async (job: Job) => {
            const payload = job.data as { jobId: string; text?: string; fileKey?: string; type: string };
            const { jobId, text, fileKey, type } = payload;

            try {
                await updateJob(jobId, "processing", 10);

                // 1. Ingest / normalise text
                let processedText = text;
                let ingestionResult: ServiceData | null = null;
                if (fileKey) {
                    const res = await axios.post(`${INGESTION_URL}/parse`, { file_key: fileKey });
                    const ingData = res.data as ServiceData;
                    processedText = ingData.full_text as string;
                    ingestionResult = ingData;
                }
                await updateJob(jobId, "processing", 30);

                const results: Record<string, unknown> = { raw_ingestion: ingestionResult };

                // 2. Plagiarism check
                if (type === "analyze" || type === "full_report") {
                    const plagRes = (await axios.post(`${PLAGIARISM_URL}/check`, {
                        text: processedText,
                        job_id: jobId,
                    })).data as ServiceData;
                    results.plagiarism_score = plagRes.score;
                    results.plagiarism_report = plagRes.report;
                    await updateJob(jobId, "processing", 60);
                }

                // 3. AI detection
                if (type === "analyze" || type === "full_report") {
                    const aiRes = (await axios.post(`${AI_DETECTION_URL}/detect`, {
                        text: processedText,
                    })).data as ServiceData;
                    results.ai_score = aiRes.score;
                    const ci = aiRes.confidence_interval as number[];
                    results.ai_confidence_low = ci[0];
                    results.ai_confidence_high = ci[1];
                    results.ai_signals = aiRes.signals;
                    await updateJob(jobId, "processing", 90);
                }

                await updateJob(jobId, "completed", 100, results);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                await getDb().query("UPDATE jobs SET status='failed', error=$1, updated_at=NOW() WHERE id=$2", [
                    message,
                    jobId,
                ]);
                throw err;
            }
        },
        { connection: getRedis(), concurrency: 5 }
    );

    new Worker(
        "humanize",
        async (job: Job) => {
            const { jobId, text } = job.data as { jobId: string; text: string };
            try {
                await updateJob(jobId, "processing", 20);
                const humRes = (await axios.post(`${HUMANIZER_URL}/humanize`, { text })).data as ServiceData;
                await updateJob(jobId, "completed", 100, {
                    humanized_text: humRes.humanized_text as string,
                    humanize_validation: humRes.validation,
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                await getDb().query("UPDATE jobs SET status='failed', error=$1, updated_at=NOW() WHERE id=$2", [
                    message,
                    jobId,
                ]);
                throw err;
            }
        },
        { connection: getRedis(), concurrency: 3 }
    );

    console.log("✅ BullMQ workers started");
}
