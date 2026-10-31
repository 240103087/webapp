# Process

How work is organised. It combines two articles:

- "AI-Native Development: Specifications, Loop and Graph Engineering" gives
  the *how*: a spec, a task list moved into GitHub issues, and three roles
  (PM, Engineer, QA) that work every issue through the same lifecycle
- "Build and ship a full-stack app with AI coding assistants" gives the
  *order*: frontend with a mocked services layer first, then the API
  contract, then the backend, then the database, then connecting them

Tasks are GitHub issues in this repository. `_docs/outdated/tasks.md` is the
original task list; the issues are the source of truth now.

- Work on one issue at a time
- Read the acceptance criteria before starting, and again before closing
- Commit regularly; every commit message references its issue, `(#n)`
- Push as you go. Work nobody can see on GitHub is work nobody can review

## Labels

- `mvp` - part of v1 as described in `_docs/plan.md`
- `post-mvp` - a follow-up filed during grooming, not part of v1
- `user-test-bug` - a bug found by running the app and testing it by hand.
  It goes through the same lifecycle, and QA adds a test case for it so it
  cannot come back
- `iteration-1` ... `iteration-7` - which stage of the build an issue
  belongs to

## Iterations

Issues are worked through in number order inside an iteration, because
later issues build on what earlier ones create. An iteration ends with
something that runs.

| # | Iteration | Ends with |
|---|-----------|-----------|
| 0 | Setup | an empty project with a passing test in every package |
| 1 | Frontend with a mock service | the whole app clickable in the browser, data from `frontend/src/api/mock/` |
| 2 | API contract | `openapi.yaml` describing every call the services layer makes, linted |
| 3 | Backend, in-memory store | every endpoint in `openapi.yaml` implemented and tested, data lost on restart |
| 4 | Backend, SQLite | the same tests passing against SQLite through Prisma; data survives a restart |
| 5 | Connect | the frontend talks to the backend; end-to-end tests in a real browser |
| 6 | Bug bash | the app tested by hand; every bug filed as `user-test-bug` and fixed |
| 7 | Deploy (#48) | one Docker image, Postgres, Docker Compose, tests against the stack, AWS with CloudFormation, CI/CD with a health check (#70-#76) |

Iteration 7 follows "Deploy a Full-Stack App with AI Coding Assistants":
containerize, switch to Postgres, add Compose and tests against it, deploy
by hand once, then automate the deploy in CI.

## Roles

Each role has its own definition, and runs as its own agent session:

- Product Manager - `_docs/team/pm.md`. Grooms an issue into the template
  from `_docs/task-template.md`, or `_docs/bug-template.md` for a bug
- Software Engineer - `_docs/team/software-engineer.md`. Implements one
  groomed issue on its own branch
- QA Engineer - `_docs/team/qa-engineer.md`. Checks the work against the
  acceptance criteria, posts PASS or FAIL, and closes the issue on PASS.
  Also files `user-test-bug` issues and writes their test cases

## Lifecycle of an issue

```
PM grooms --> Engineer implements --> QA verifies --PASS--> merge, QA closes
                    ^                      |
                    +--------- FAIL -------+
```

1. Pick the next open `mvp` or `user-test-bug` issue
2. PM grooms it ("Groom issue #4"). The issue body is rewritten into the
   template and a `## PM: groomed` comment lists the decisions made and
   the follow-ups filed
3. For a `user-test-bug` issue only: QA adds a `## QA: test cases`
   comment with the failing test to write and the manual checks
4. Engineer implements it ("Implement issue #4") on the branch `issue-4`,
   pushes, and comments `## Engineer: implemented`
5. QA tests it ("Test issue #4") and comments `## QA: PASS` or
   `## QA: FAIL`
6. On FAIL, the engineer takes the QA comment as input and fixes it. Back
   to step 5. Repeat until PASS
7. On PASS, the orchestrator merges the branch into main, pushes main and
   comments `## Merged` with the commit. QA then closes the issue as
   completed

## CI

`.github/workflows/ci.yml` runs on every push and pull request (#75):

1. In parallel: frontend and shared tests; backend tests on the memory
   store, SQLite and a Postgres service; `npm run build`
2. Then, in parallel: the Playwright tests on `npm start` with SQLite
   (`npm run e2e`), and the Docker Compose stack with Postgres
   (`npm run test:stack`)
3. On `main` only, when the repository variable `AWS_DEPLOY_ROLE_ARN` is
   set: deploy to AWS through the GitHub OIDC role and SSM, then poll
   `/api/health` until it answers 200 (`deploy/aws/README.md`)

Traces are uploaded when an end-to-end test fails. A red `main` is fixed before anything else. When
the proof of a fix is CI itself (for example an unhandled rejection that
only showed up there, #59), QA closes the issue after CI is green on
`main`.

## Orchestrator

The main session is the orchestrator. It starts the roles and does none
of their work itself. Its rules:

- Never skip grooming
- The engineer does not close issues
- QA does not fix code
- An issue is closed only after a QA PASS, and only by QA
- Merge one branch at a time: rebase on main, run `npm test` and
  `npm run build` again, merge, push main
- Stop when every `mvp` and `user-test-bug` issue is closed. That is the
  stop condition

## Capturing corrections

When a person corrects an agent during a session, the agent commits its
current work, then: "Based on the corrections I made, find the relevant
documents and update them." The correction then lives in `AGENTS.md`,
`_docs/design-system.md` or `_docs/testing-guidelines.md`.
