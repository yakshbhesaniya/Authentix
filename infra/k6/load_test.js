import http from "k6/http";
import { sleep, check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
let token = "";

export const options = {
    stages: [
        { duration: "30s", target: 10 },   // Warm up
        { duration: "1m", target: 50 },   // Ramp up
        { duration: "2m", target: 100 },  // Peak load
        { duration: "30s", target: 0 },    // Wind down
    ],
    thresholds: {
        http_req_duration: ["p(95)<3000"], // 95% of requests under 3s
        http_req_failed: ["rate<0.05"],  // Less than 5% failures
    },
};

export function setup() {
    // Register a test user
    const res = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({ name: "Load Tester", email: `load_${Date.now()}@test.com`, password: "Test123456" }),
        { headers: { "Content-Type": "application/json" } }
    );
    if (res.status === 201 || res.status === 200) {
        return { token: res.json("token") };
    }
    return { token: "" };
}

export default function (data: { token: string }) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.token}`,
    };

    const sampleText = `
    Artificial intelligence has rapidly transformed the way we interact with technology.
    Machine learning models now power everything from recommendation systems to autonomous vehicles.
    The convergence of big data and deep learning has unlocked unprecedented capabilities.
    However, this progress also raises important ethical questions about bias, transparency, and accountability.
  `;

    // Test /analyze
    const analyzeRes = http.post(
        `${BASE_URL}/analyze`,
        JSON.stringify({ text: sampleText }),
        { headers }
    );
    check(analyzeRes, {
        "analyze returns 202": (r) => r.status === 202,
        "analyze has jobId": (r) => r.json("jobId") !== null,
    });

    sleep(1);

    // Test /health
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, { "health ok": (r) => r.status === 200 });

    sleep(2);
}
