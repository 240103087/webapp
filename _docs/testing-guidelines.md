# Testing guidelines

Read before writing tests.

## Where tests live

- `shared/test/*.test.ts` - pure functions. Every rule in
  `_docs/plan.md` that `shared` implements has a test with the limit
  itself and one past it (80 chars ok, 81 fails)
- `frontend/src/**/*.test.tsx` - components and pages with Testing
  Library, against the mock service. Query by role and label, the way a
  user finds things, not by class names. `renderApp` wraps the app in
  `<StrictMode>` like `main.tsx`, so effects run twice in tests as in
  development (#52)
- `frontend/src/api/http/httpApi.test.ts` - the HTTP client with `fetch`
  stubbed and a fake `XMLHttpRequest` for uploads
- `backend/test/*.test.ts` - API tests with Supertest. `npm test -w
  backend` runs the whole folder twice: on the memory store, then with
  `TEST_STORE=prisma` on SQLite (each test gets a copy of a migrated
  database). `store.suite.ts` runs the same store tests on both stores
- `e2e/tests/*.spec.ts` - Playwright, Chromium, desktop (1280x800) and
  phone (375x812), against `npm start` on :8788 with a fresh SQLite file
  and upload folder. With `E2E_BASE_URL` they run against an app that is
  already running instead
- Postgres: `npm run test:postgres -w backend` runs the backend tests
  once more on Postgres at `TEST_POSTGRES_URL`; each test gets its own
  migrated schema. For a local Postgres:
  `docker run -d -p 5432:5432 -e POSTGRES_USER=moveeasy -e POSTGRES_PASSWORD=moveeasy -e POSTGRES_DB=moveeasy postgres:16-alpine`
- `e2e/stack/*.spec.ts` - integration tests for the Docker Compose stack:
  the image serves the frontend, the app uses Postgres, data survives a
  restart of the app container. `npm run test:stack` starts the stack,
  runs these and the whole Playwright suite against it, and removes it

## Rules

- Every bug fix starts with a test that fails before the fix. Its name
  says what was broken: `it("keeps the PIN when other fields change")`
- Test the behaviour the issue describes, not the implementation
- API tests check the status code and the body. `testApp()` also checks
  every response against `openapi.yaml` and fails the test on any
  mismatch, so an undocumented status or field cannot slip in (#32)
- For privacy, test the negative: another owner's token gets 404, a
  visitor without a PIN gets no `message` field at all
- Time: inject `now` instead of waiting. Never `sleep` in a test
- Pass `now` all the way down. A helper called from a fixed-clock test must
  not read `Date.now()`, or the test passes today and fails a week later
  (the mock PIN unlock tests broke this way, #65)
- No test depends on another test's data. Each API test file creates its
  own app with a fresh store
- To test a failing backend in a component test, stub the service:
  `vi.spyOn(api, "listTags").mockRejectedValue(new ApiError(0, ...))`.
  Use `mockRejectedValue`, not `...Once`: StrictMode runs the effect
  twice, and the second call would succeed. Call `mockRestore()` before
  clicking Retry
- An unhandled promise rejection fails the run (Vitest reports it even
  when every test passed). Every data load needs a `catch` (#59)
- End-to-end: the fixture in `e2e/tests/fixtures.ts` fails any test that
  logs a console error or throws. A test that expects an HTTP error (a
  wrong PIN is a 403) declares it with `test.use({ allowHttpErrors:
  [403] })`. Use `uniqueEmail()` for new accounts, and pass `baseURL` to
  any extra browser context (a visitor's)
- Keep tests fast: the whole `npm test` should stay under a minute
