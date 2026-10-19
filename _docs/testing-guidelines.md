# Testing guidelines

Read before writing tests.

## Where tests live

- `shared/test/*.test.ts` - pure functions. Every rule in
  `_docs/plan.md` that `shared` implements has a test with the limit
  itself and one past it (80 chars ok, 81 fails)
- `frontend/src/**/*.test.tsx` - components and pages with Testing
  Library, against the mock service. Query by role and label, the way a
  user finds things, not by class names
- `backend/test/*.test.ts` - API tests with Supertest. They run against
  both stores (`memory` and `prisma`) through `describe.each`
- `e2e/tests/*.spec.ts` - Playwright, Chromium, against the built app
  with a fresh SQLite file

## Rules

- Every bug fix starts with a test that fails before the fix. Its name
  says what was broken: `it("keeps the PIN when other fields change")`
- Test the behaviour the issue describes, not the implementation
- API tests check the status code, the body, and that the response matches
  `openapi.yaml` (the contract helper does it)
- For privacy, test the negative: another owner's token gets 404, a
  visitor without a PIN gets no `message` field at all
- Time: inject `now` instead of waiting. Never `sleep` in a test
- No test depends on another test's data. Each API test file creates its
  own app with a fresh store
- Keep tests fast: the whole `npm test` should stay under a minute
