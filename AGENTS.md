# MoveEasy Memory Tags

QR codes on gifts, moving boxes and keepsakes that open a page with a
message, photos, video and voice. React frontend, Node backend, SQLite
through Prisma. See `_docs/plan.md` for the specification.

## Layout

- `shared/` - pure TypeScript used by both sides: Zod schemas, tag codes,
  the visitor access rules, box numbering and contents search. No DOM, no
  Node APIs
- `frontend/` - React + Vite app. `src/api/` is the services layer: the
  interface in `types.ts`, the mock in `mock/`, the HTTP client in `http/`
- `backend/` - Express API. `src/store/` holds the `Store` interface and
  its two implementations (memory, Prisma). Routes never touch Prisma
  directly
- `e2e/` - Playwright tests against the running app
- `openapi.yaml` - the API contract. The backend and the HTTP client must
  match it. Each `operationId` is the name of an `Api` method in
  `frontend/src/api/types.ts`; `backend/test/openapi.test.ts` fails if a
  method and an operation do not pair up, so change both together
- `_docs/` - how we work and what we build

## Documents

Read only what the task needs:

- `_docs/process.md` - issues, iterations, roles, lifecycle
- `_docs/task-template.md`, `_docs/bug-template.md` - shape of an issue
- `_docs/team/pm.md`, `_docs/team/software-engineer.md`,
  `_docs/team/qa-engineer.md` - the three roles
- `_docs/design-system.md` - read before touching any screen
- `_docs/testing-guidelines.md` - read before writing tests
- `_docs/plan.md` - the spec; `_docs/stack.md` - why this stack

## Commands

- `npm install` - install every workspace
- `npm run dev` - backend on :8787 and frontend on :5173 together
- `npm run dev:mock` - frontend only, with the mock service
- `npm test` - every unit and API test in every workspace, once
- `npm test -w backend` - one workspace; `npx vitest run path/to/file`
  inside a workspace - one file
- `npm run build` - type-check and build everything
- `npm run e2e` - Playwright end-to-end tests (builds and starts the app)
- `npm run db:migrate -w backend`, `npm run db:seed -w backend` - Prisma

## Rules

- Dependencies are pinned exactly. Do not add one without saying why in
  the issue comment
- Validation rules live in `shared/src/schemas.ts` and nowhere else. The
  frontend, the mock and the backend all import them
- The frontend talks to data only through `src/api/` (the services
  interface). Components never call `fetch`
- The backend talks to data only through the `Store` interface. Only
  `backend/src/store/prisma-store.ts` imports Prisma
- Privacy is enforced on the server. The public endpoint never sends a
  message or media the visitor may not see, whatever the client asks
- User text goes into the page as React text, never through
  `dangerouslySetInnerHTML`
- Times are ISO strings in UTC in the API; the UI shows local time
- Every change keeps `npm test` and `npm run build` green
- Commit after every meaningful step; messages reference the issue:
  `Add the PIN form (#15)`
- When a correction is made during a session, update the document it
  belongs to (this file, the design system or the testing guidelines)
