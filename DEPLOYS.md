# Deployment Architecture & Policy

## ⚠️ MANDATORY ARCHITECTURAL POLICY: USE GOOGLE CLOUD RUN ONLY

For financial and cost-control reasons, **Vercel is strictly banned for production hosting of this application.** 

All deployments must run exclusively on **Google Cloud Run**.

---

### Rationale
- **Vercel Margins**: Vercel charges high markup margins for bandwidth egress and serverless function durations.
- **Cloud Run Pay-Per-Use**: Google Cloud Run scales to zero instances when idle, incurring zero costs during low-traffic periods, and charges by the exact millisecond of CPU/Memory consumption.
- **Resource Proximity**: Cloud Run hosts the Next.js server close to the database (Neon PostgreSQL), Redis, and Firebase, minimizing network latency and allowing secure VPC/private service peering.

---

### Deployment Pipeline
The application is deployed using **Google Cloud Build** and **Google Cloud Run** via the following configuration:

1. **Docker Containerization**:
   - The Next.js build is configured for standalone output (`output: 'standalone'` in `next.config.ts`).
   - The [Dockerfile](file:///Users/yvesdarbouze/Documents/PaperWorking/Dockerfile) compiles the app in standalone mode and packages it on a lightweight `node:20-alpine` runner.
   - Note: The Prisma schema directory `prisma/` must always be copied *before* `npm install` inside the Dockerfile so that the `postinstall` database client generation script does not fail.

2. **Cloud Build Execution**:
   - Build definition lives in [cloudbuild.yaml](file:///Users/yvesdarbouze/Documents/PaperWorking/cloudbuild.yaml).
   - Project: `paperworking-97055`
   - Registry Repository: `cloud-run-source-deploy`
   - Target Region: `us-east4`
   - Service Name: `paperworker`

3. **How to Trigger Build & Deploy**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

4. **Secrets & Environment Configuration**:
   - The following secrets must be configured in **Google Cloud Secret Manager**:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
   - These are automatically updated on the Cloud Run container at deploy time via the `--update-secrets` flag.
   - Ensure other runtime environment variables (e.g. `DATABASE_URL`, `STRIPE_SECRET_KEY`) are set on the Cloud Run service.
