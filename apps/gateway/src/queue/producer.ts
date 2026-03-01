import { Queue } from "bullmq";
import { getRedis } from "./redis";

export type JobPayload = {
    jobId: string;
    userId: string;
    type: "analyze" | "humanize" | "full_report";
    text?: string;
    fileKey?: string;
    fileType?: string;
    options?: Record<string, unknown>;
};

let analyzeQueue: Queue;
let humanizeQueue: Queue;

export function getAnalyzeQueue(): Queue {
    if (!analyzeQueue) {
        analyzeQueue = new Queue("analyze", { connection: getRedis() });
    }
    return analyzeQueue;
}

export function getHumanizeQueue(): Queue {
    if (!humanizeQueue) {
        humanizeQueue = new Queue("humanize", { connection: getRedis() });
    }
    return humanizeQueue;
}

export async function enqueueJob(payload: JobPayload): Promise<string> {
    const queue =
        payload.type === "humanize" ? getHumanizeQueue() : getAnalyzeQueue();
    const job = await queue.add(payload.type, payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: false,
        removeOnFail: false,
    });
    return job.id!;
}
