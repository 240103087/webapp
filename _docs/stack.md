# Stack

| Part | Choice | Why |
|------|--------|-----|
| Language | TypeScript everywhere | one language; the rules in `shared/` run in the mock, the backend and the tests |
| Frontend | React 18 + Vite + React Router | the stack the full-stack article uses; fast dev server |
| Validation | Zod | one schema gives runtime checks and TypeScript types on both sides |
| Backend | Node + Express | small, well known, easy to test with Supertest |
| ORM | Prisma | migrations and a typed client for SQLite and Postgres |
| Database | SQLite locally, Postgres in production | SQLite needs no server for development and tests; Postgres runs on the server (#71). `DATABASE_URL` picks one. Prisma cannot read its provider from env, so Postgres has its own schema, migrations and generated client in `backend/prisma/postgres/`, and a test keeps the models of the two schemas identical |
| Container | Docker, one image | a multi-stage build: the frontend is built in one stage and served by the API in the final one, so production is one container plus Postgres (#70) |
| Hosting | AWS EC2 via CloudFormation, Caddy | the deploy article's setup: one instance with Docker Compose (app, Postgres, Caddy for automatic HTTPS), an Elastic IP, no SSH (SSM), `<ip>.sslip.io` when there is no domain (#74) |
| CI/CD | GitHub Actions + OIDC | tests in parallel, the Compose stack tested, then a deploy through an IAM role GitHub assumes with a short-lived token, so no AWS keys are stored in GitHub (#75) |
| Files | disk folder (`UPLOAD_DIR`) | keeps the database small; S3 is a post-MVP issue |
| QR | `qrcode` | renders PNG and SVG in the browser and in Node |
| Tests | Vitest, Testing Library, Supertest, Playwright | unit, component, API and real-browser tests |
| Contract | `openapi.yaml` (OpenAPI 3.0.3), `swagger-parser`, Ajv | the file is validated in `npm test`, its operations are matched to the services-layer methods, and the backend's responses are checked against it (#32) |

Things deliberately not used: a CSS framework (the design comes from the
Claude Design canvas and is small enough for plain CSS with variables), a
state library (React state and the services layer are enough), an auth
provider (email and password with bcrypt and bearer tokens).
