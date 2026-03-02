# Authentix Project Libraries & Setup Guide

This document contains a comprehensive list of all the libraries and their versions used across the Authentix project, as well as alternative instructions for running the project locally without running your services through Docker.

## Part 1: Complete Library List

### 1. Node.js Applications

#### `apps/web` (Frontend - Next.js)
**Dependencies:**
- `@radix-ui/react-dialog`: ^1.1.15
- `@radix-ui/react-progress`: ^1.1.8
- `@radix-ui/react-tabs`: ^1.1.13
- `framer-motion`: ^12.34.3
- `lucide-react`: ^0.575.0
- `next`: 16.1.6
- `react`: 19.2.3
- `react-dom`: 19.2.3
- `react-dropzone`: ^15.0.0
- `react-hot-toast`: ^2.6.0
- `zustand`: ^5.0.11

**Dev Dependencies:**
- `@tailwindcss/postcss`: ^4
- `@types/node`: ^20
- `@types/react`: ^19
- `@types/react-dom`: ^19
- `eslint`: ^9
- `eslint-config-next`: 16.1.6
- `tailwindcss`: ^4
- `typescript`: ^5

#### `apps/gateway` (API Gateway - Fastify)
**Dependencies:**
- `@fastify/cors`: ^11.2.0
- `@fastify/jwt`: ^10.0.0
- `@fastify/multipart`: ^9.4.0
- `@fastify/rate-limit`: ^10.3.0
- `@fastify/static`: ^9.0.0
- `axios`: ^1.13.5
- `bcryptjs`: ^3.0.3
- `bullmq`: ^5.70.1
- `drizzle-orm`: ^0.45.1
- `fastify`: ^5.7.4
- `ioredis`: ^5.9.3
- `minio`: ^8.0.6
- `pg`: ^8.19.0
- `pino`: ^10.3.1
- `pino-pretty`: ^13.1.3
- `uuid`: ^13.0.0
- `zod`: ^4.3.6

**Dev Dependencies:**
- `@types/bcryptjs`: ^2.4.6
- `@types/node`: ^25.3.2
- `@types/pg`: ^8.16.0
- `@types/uuid`: ^10.0.0
- `drizzle-kit`: ^0.31.9
- `nodemon`: ^3.1.14
- `ts-node`: ^10.9.2
- `typescript`: ^5.9.3

### 2. Python Microservices

#### Common Data Science & Core Libraries (Used Across Most Services)
- `fastapi==0.110.0`
- `uvicorn[standard]==0.29.0`
- `numpy==1.26.4`
- `pydantic==2.7.0`

#### `services/ai-detection`
- `transformers==4.40.0`
- `torch==2.3.0`
- `scikit-learn==1.4.2`
- `scipy==1.13.0`
- `spacy==3.7.4`

#### `services/evaluation`
- `scikit-learn==1.4.2`
- `psycopg2-binary==2.9.9`

#### `services/humanizer`
- `transformers==4.40.0`
- `torch==2.3.0`
- `sentence-transformers==2.7.0`
- `spacy==3.7.4`
- `httpx==0.27.0`

#### `services/ingestion`
- `pdfplumber==0.11.0`
- `pdfminer.six==20231228`
- `python-docx==1.1.0`
- `minio==7.2.5`
- `python-multipart==0.0.9`
- `chardet==5.2.0`
- `unicodedata2==15.1.0`

#### `services/plagiarism`
- `sentence-transformers==2.7.0`
- `qdrant-client==1.9.1`
- `datasketch==1.6.4`
- `scipy==1.13.0`
- `redis==5.0.4`

---

## Part 2: Running the Project Locally (Non-Docker Code Execution)

Running this architecture *completely* without Docker means installing PostgreSQL, Redis, MinIO, and Qdrant natively on Windows, which is extremely complex and error-prone. 

The standard approach for a "non-Docker PC" setup while preserving the existing infrastructure is **Hybrid Execution**: You run the infrastructure (Databases/Queues) using Docker, but run your source code directly on your host machine using `npm` and `python` so you get native debugging, hot-reloading, and no container file limits.

### Step 1: Start ONLY the Infrastructure via Docker
Open a terminal in the `infra` folder, and instead of running `docker-compose up`, strictly boot the databases:

```bash
cd infra
docker-compose up -d postgres redis qdrant minio
```
*This leaves the API Gateway, Web app, and 5 Python services turned off in Docker, waiting to be run by you locally.*

### Step 2: Set up Environment Variables
Ensure you map the environment variables correctly for local testing. By default, `docker-compose` bridges `postgres` to `postgres:5432`, but on your local machine, it is `localhost:5432`.
Create `.env` files locally in your folders or export them in your terminals:
- Database: `postgresql://authentix:authentix_secret@localhost:5432/authentix`
- Redis: `redis://localhost:6379`
- MinIO: `localhost:9000` (User: `authentix`, Pass: `authentix_secret`)
- Qdrant: `http://localhost:6333`

### Step 3: Run the API Gateway Locally
Open a new terminal:
```bash
cd apps/gateway
npm install
npm run dev
```
*Your gateway is now running natively on port 4000.*

### Step 4: Run the Web App Locally
Open a new terminal:
```bash
cd apps/web
npm install
npm run dev
```
*Your frontend is now running natively on port 3000.*

### Step 5: Run the Python Services Locally
You will need to create a dedicated Python environment for each service to avoid version conflicts on your PC. Proceed with this logic for **each** of the 5 services:

**For Ingestion:**
```bash
cd services/ingestion
python -m venv venv
# Activate virtual environment (Windows):
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**For Plagiarism:**
```bash
cd services/plagiarism
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```
*(Repeat for `ai-detection` on port 8003, `humanizer` on port 8004, and `evaluation` on port 8005).*

### Downloading Required Local Meta-Dependencies:
If you are running the python scripts locally, they download models locally:
- Python will download `spaCy` definitions directly to your PC: `python -m spacy download en_core_web_sm`
- HuggingFace local models (like `all-MiniLM-L6-v2`) will be cached in your user directory (e.g., `C:\Users\<User>\.cache\huggingface`).

### Complete Native Windows Execution (Zero Docker)
If you literally cannot run Docker *at all* (e.g., strict IT policies blocking WSL2):
1. **PostgreSQL**: Download the Windows Installer from EnterpriseDB and install. Then create an `authentix` user.
2. **Redis**: Download `Memurai` (Windows port of Redis) or install via WSL1.
3. **Qdrant**: There is no native Windows compiled binary. You must build it from Rust source using `cargo build --release` or run it via WSL.
4. **MinIO**: Download the single `.exe` executable for MinIO on Windows, and run `minio.exe server C:\Data`. 
5. Finally, execute Python and Node servers as outlined in Steps 3-5 above.
