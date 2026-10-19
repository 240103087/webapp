# Stack

| Part | Choice | Why |
|------|--------|-----|
| Language | TypeScript everywhere | one language; the rules in `shared/` run in the mock, the backend and the tests |
| Frontend | React 18 + Vite + React Router | the stack the full-stack article uses; fast dev server |
| Validation | Zod | one schema gives runtime checks and TypeScript types on both sides |
| Backend | Node + Express | small, well known, easy to test with Supertest |
| ORM | Prisma | DBMS-agnostic: SQLite now, Postgres by changing `provider` and `DATABASE_URL`; migrations; typed client |
| Database | SQLite | required by the assignment; a file, no server |
| Files | disk folder (`UPLOAD_DIR`) | keeps the database small; S3 is a post-MVP issue |
| QR | `qrcode` | renders PNG and SVG in the browser and in Node |
| Tests | Vitest, Testing Library, Supertest, Playwright | unit, component, API and real-browser tests |
| Contract | `openapi.yaml` + Ajv | the backend's responses are checked against the contract in tests |

Things deliberately not used: a CSS framework (the design comes from the
Claude Design canvas and is small enough for plain CSS with variables), a
state library (React state and the services layer are enough), an auth
provider (email and password with bcrypt and bearer tokens).
