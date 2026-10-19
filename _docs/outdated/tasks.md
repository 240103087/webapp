# Tasks

The original task list, written from `_docs/plan.md` before any code.
It was moved into GitHub issues (same numbers, same order); the issues
are the backlog now and this file is not updated any more.

## Iteration 0 - setup

### 1. Project setup: workspaces and a passing test in each package

**Goal:** The repository builds and tests with one command, with empty `shared`, `frontend`, `backend` and `e2e` packages.

Set up npm workspaces with TypeScript, Vitest in each package and one passing test each. Add root scripts `npm test`, `npm run build`, `npm run dev`, and a GitHub Actions workflow that runs tests and build on every push.

## Iteration 1 - frontend with a mock service

### 2. Shared validation rules for tags, moves, media, replies and accounts

**Goal:** There is one place that says what valid input is, used by both the mock service and the backend.

Zod schemas in `shared/` for sign up, log in, tag create/update (with kind-specific fields), move create/update, media limits by type, reply, PIN. Unit tests cover every limit in `_docs/plan.md`.

### 3. Shared tag codes and the visitor access rules

**Goal:** Codes are generated and the decision of what a visitor may see is made by one pure function.

A code generator using the 30-character alphabet from the plan, a code normaliser for typed codes (lowercase, spaces, dashes), and `visitorView(tag, now, unlocked)` returning one of unknown/archived/private/timeLocked/pinRequired/open. Unit tests for every state and their order.

### 4. Shared box numbering and contents search

**Goal:** Box numbers per move and the 'where is my kettle?' search behave the same everywhere.

`nextBoxNumber(move)` never reuses a number, `searchContents(boxes, query)` matches case-insensitively, ignores extra spaces, and returns the box, room and the matched items. Unit tests with Cyrillic and Kazakh letters too.

### 5. Frontend app shell, routing and design tokens

**Goal:** The frontend runs with the layout, navigation and look from the Claude Design canvas.

React + Vite + TypeScript app with React Router: top bar, routes for dashboard, tag editor, moves, print labels, public tag page, auth pages and a 404. CSS variables from `_docs/design-system.md`, fonts, buttons, inputs, badges.

### 6. Services layer and mock backend with seed data

**Goal:** Every screen gets data through one services interface, and a mock implementation makes the app fully clickable without a server.

`frontend/src/api/types.ts` defines the interface and data types; `mock/` implements it in memory with simulated latency, persists to localStorage, and seeds two demo users, tags of every kind and privacy, a move with 12 boxes and demo photos. Tests for the mock.

### 7. Sign up, log in and log out

**Goal:** An owner can create an account, log in, stay logged in after a reload, and log out.

Sign up and log in pages with validation errors under fields, a session token kept in localStorage, protected routes redirecting to log in and back. Demo credentials shown on the log in page.

### 8. Dashboard with tag cards, counters, search, filters and sort

**Goal:** The owner sees all their tags and can find one quickly.

Counters (tags, scans this week, unread replies), tag cards as in the design, search by title, filter by kind and move, sort newest / most scanned, empty state, filters kept in the URL.

### 9. Tag editor: create and edit a tag with kind-specific fields

**Goal:** The owner can create and edit gifts, boxes and keepsakes.

Form with kind, title, recipient, message, and for boxes move, room, contents list and fragile. Validation from `shared`, unsaved-changes warning, saving redirects to the tag page.

### 10. Tag editor: privacy, PIN, time lock, replies and theme

**Goal:** The owner controls who can see a tag and when.

Privacy cards public/PIN/private, PIN input (4-6 digits, kept if not changed), optional open-on date and time in the future, allow replies switch, six themes.

### 11. Media: upload photos, video and audio with captions and order

**Goal:** The owner can attach up to 20 media files to a tag.

Drop zone and file picker, type and size limits from the plan with clear errors, upload progress, captions, move up/down, delete with confirm, thumbnails.

### 12. Media: record a voice message in the browser

**Goal:** The owner can record a voice message without leaving the page.

Record button using the microphone (MediaRecorder), timer, stop at 3 minutes, listen before saving, save as an audio media item. A clear message when the microphone is blocked or not supported.

### 13. QR code panel with PNG and SVG download

**Goal:** Each tag shows its QR code and the owner can download it.

The tag page shows the QR for the full public URL, the code in mono split 4-4, copy link button, download PNG (1024px) and SVG.

### 14. Public tag page: the open tag

**Goal:** A visitor who scans an open tag sees its content, nicely, on a phone.

`/t/:code` shows title, recipient, message with line breaks, the gallery with full-screen photos, video and audio players, and box details (number, room, fragile, contents, move). Uses the tag's theme. Owner sees a preview banner.

### 15. Public tag page: unknown, archived, private, time-locked and PIN states

**Goal:** A visitor sees exactly what the privacy rules allow, and nothing more.

A screen for each state from the plan, a live countdown for time-locked tags, a PIN form with the attempts left and a 15-minute lockout, remembering an unlock for 24 hours.

### 16. Replies: visitors reply, owners read and delete

**Goal:** A visitor can say thank you and the owner sees it.

Reply form on the open public page when replies are on, validation and the 10-per-hour limit, owner's list of replies on the tag page, unread count on the dashboard, mark as read when seen, delete.

### 17. Moves: list, create, edit, delete and the move page

**Goal:** The owner can organise boxes into moves.

Moves list, move form (name, from, to, date), move page with boxes grouped by room with counts, add box to this move, delete only when the move has no boxes.

### 18. Move search: where is my kettle?

**Goal:** During a move the owner finds which box something is in.

Search field on the move page using the shared search, results with box number, room and the matched items highlighted, links to the box.

### 19. Print labels on A4

**Goal:** The owner can print QR labels and stick them on things.

Pick tags or a whole move, pick size S/M/L, A4 preview with labels (QR, title, box number, room, FRAGILE), print styles so only the sheet is printed.

### 20. Archive, unarchive and delete a tag

**Goal:** The owner can retire or remove a tag.

Archive/unarchive from the tag page and card menu, archived filter on the dashboard, delete with a confirmation that names the tag and says media is removed.

### 21. Phone layout and accessibility pass

**Goal:** Every screen works at 375px and with a keyboard.

Check every page at 375px and 1440px, labels on every input, focus styles, alt text from captions, color contrast 4.5:1, aria-live for errors and the countdown.

## Iteration 2 - API contract

### 22. OpenAPI contract for the services layer

**Goal:** `openapi.yaml` describes every call the frontend makes, so the backend has a precise target.

Read `frontend/src/api/types.ts` and the mock, write `openapi.yaml` at the repo root: every endpoint, method, request and response body, error format, which endpoints need a token, and how media is uploaded and served. Lint it in `npm test`.

## Iteration 3 - backend with an in-memory store

### 23. Backend skeleton: Express app, config, errors and tests

**Goal:** The backend starts, answers a health check, and has the patterns every endpoint will follow.

Express + TypeScript in `backend/`, config from env, JSON error format from `openapi.yaml`, Zod validation middleware, CORS for the dev frontend, request logging, Supertest harness.

### 24. Store interface and in-memory store with seed data

**Goal:** All data access goes through one interface, implemented first in memory.

`Store` interface for users, sessions, tags, media, replies, moves, scans and PIN attempts; `MemoryStore`; a seed with the same demo data as the mock; a store test suite that any implementation must pass.

### 25. Auth API: sign up, log in, log out, me

**Goal:** Owners can authenticate against the backend.

Passwords hashed with bcrypt, random bearer tokens stored as sessions, 401 for missing or bad tokens, 409 for a taken email.

### 26. Tags API

**Goal:** The owner can create, list, read, update, archive and delete tags through the API.

Endpoints from `openapi.yaml`, validation from `shared`, owner-only access (404 for other owners' tags), list with search, kind, move, archived filters and sort, box number assigned by the server.

### 27. Media API: upload, serve, caption, reorder, delete

**Goal:** Media files are stored on disk and served only to people allowed to see them.

Multipart upload with type and size checks, files in `UPLOAD_DIR`, signed expiring URLs for serving, captions, reorder, delete removes the file, deleting a tag removes its files.

### 28. Public API: visitor view, PIN unlock and scan counting

**Goal:** The server enforces privacy and the time lock.

`GET /public/tags/{code}` returns only what `visitorView` allows (no message or media before the open date), `POST /public/tags/{code}/unlock` checks the PIN with the 5-tries/15-minutes lockout and returns a 24-hour access token, scans counted for visitors only.

### 29. Replies API

**Goal:** Visitors can reply and owners can manage replies through the API.

Create reply on an open tag with replies on, 429 after 10 per tag per hour, owner list, mark read, delete.

### 30. Moves API and contents search

**Goal:** Moves and the box search work through the API.

CRUD for moves, 409 when deleting a move with boxes, `GET /moves/{id}/search?q=` using the shared search, boxes grouped by room.

### 31. Dashboard stats API

**Goal:** The dashboard counters come from the server.

Tags count, scans in the last 7 days, unread replies, per tag scans and replies counts in the list.

### 32. Contract test: API responses match openapi.yaml

**Goal:** The backend cannot drift from the contract without a failing test.

Every API test response is validated against the schema in `openapi.yaml` (Ajv), and a test checks that every path in the contract has a route.

## Iteration 4 - SQLite through Prisma

### 33. Prisma schema, migrations and seed for SQLite

**Goal:** The data model exists as a Prisma schema with migrations and a seed.

`backend/prisma/schema.prisma` with models for every entity, `prisma migrate` migrations, `npm run db:seed`, `DATABASE_URL` from env, nothing SQLite-specific.

### 34. Prisma store passing the store test suite

**Goal:** The backend runs on SQLite with the same behaviour as in memory.

`PrismaStore` implements `Store`; the store and API test suites run against both stores; `STORE=memory|prisma` chooses one; transactions where two writes must happen together.

### 35. Data survives a restart

**Goal:** Tags, media and replies are still there after the server restarts.

A test that starts the server on a file database, writes data, restarts and reads it back; media files and their records stay consistent; README explains resetting the database.

## Iteration 5 - connect frontend and backend

### 36. HTTP client for the services layer

**Goal:** The frontend talks to the real backend through the same interface as the mock.

`http/` implementation of the services interface, `VITE_API=mock|http`, Vite proxy to the backend, uploads with progress, media URLs from the server.

### 37. Error handling between frontend and backend

**Goal:** Network and API errors are shown clearly and never lose the user's work.

401 logs out and sends to log in with a return path, 4xx field errors appear under fields, network errors show a retry toast, upload errors per file.

### 38. One command to run everything

**Goal:** `npm run dev` starts the backend and the frontend together, and production serves both from one port.

Dev script running both, the backend serving the built frontend in production, `npm start`, README with setup, env variables and demo accounts.

### 39. End-to-end tests in a real browser

**Goal:** The main flows are tested in Chromium against the real frontend and backend.

Playwright tests: sign up, create a gift with a photo and a PIN, open it as a visitor with a wrong and a right PIN, reply, see the reply; time-locked tag; move with boxes and search; print labels page.

## Post-MVP

### 40. NFC tags in addition to QR

**Goal:** A tag can also be opened by tapping an NFC sticker.

Write the public URL to an NFC sticker from the phone (Web NFC) and show how on the tag page.

### 41. Regenerate a tag's code

**Goal:** An owner can invalidate a printed QR that was lost or shared by mistake.

Generate a new code, the old link shows 'unknown', reprint reminder.

### 42. Email the owner on a scan or a reply

**Goal:** Owners learn about scans and replies without opening the app.

Email notifications with per-tag settings and a daily digest option.

### 43. Collaborators on a move

**Goal:** Two people can manage one move together.

Invite by email, roles editor/viewer, both see the move and its boxes.

### 44. Russian and Kazakh interface

**Goal:** The app is usable in Russian and Kazakh.

i18n for every screen, the public page follows the visitor's language.

### 45. Store media in S3-compatible storage

**Goal:** Media survives moving the server and scales.

A storage interface with disk and S3 implementations chosen by env.

### 46. Record video in the browser

**Goal:** The owner can record a video greeting from the page.

MediaRecorder video with a preview and a 1-minute limit.

### 47. Order printed stickers

**Goal:** The owner can order waterproof printed stickers.

Integration with a print service, sticker sizes and delivery.

### 48. Docker, Postgres and deployment

**Goal:** The app runs on a public server with Postgres.

Dockerfiles, docker compose with Postgres, CI deploy.

### 49. Scan history chart per tag

**Goal:** The owner sees when a tag was scanned over time.

Scans per day for the last 30 days on the tag page.

### 50. Password reset by email

**Goal:** An owner who forgot their password can get back in.

Reset link by email, valid for one hour.

### 51. Tag templates

**Goal:** Common tags (birthday gift, kitchen box) take one click to create.

A few templates prefilling kind, message, room and contents.
