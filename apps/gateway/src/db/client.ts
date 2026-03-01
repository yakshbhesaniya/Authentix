import { Pool } from "pg";

let pool: Pool;

export async function initDb(): Promise<void> {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL || "postgresql://authentix:authentix_secret@localhost:5432/authentix",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    console.log("✅ PostgreSQL connected");
}

export function getDb(): Pool {
    if (!pool) throw new Error("DB not initialised");
    return pool;
}
