# Brainstorming session: MoveEasy Memory Tags

Chat history of how the idea for Part II was picked and narrowed down into
a specification, before any code was written. It follows the flow from
"AI-Native Development: Specifications, Loop and Graph Engineering": start
from a vague idea, let the assistant ask one question at a time with
options, keep answers short, and at the end save everything to a markdown
file that becomes `_docs/plan.md`.

The conversation happened in Russian in a Claude project thread; it is
given here in English, with Sabina's messages kept close to the original.

- Part 1 - the assignment
- Part 2 - picking the idea (four rounds)
- Part 3 - narrowing the idea into a spec, one question at a time
- Part 4 - how the two articles were combined into one plan
- Part 5 - the first prompts given to the coding agent

---

## Part 1. The assignment

**Sabina:** Pick a project idea, different from Part I, and come up with a
non trivial app (no habit tracker, to-do list, etc). Come up with an idea
you will be proud to show off. If interested in startup and money part, get
ideas from: https://trustmrr.com/

- Fully follow ai-native-development-specifications and
  build-and-ship-a-full-stack-app-with. I know they start from different
  places, but think about how can you combine.
- Utilize GitHub Issues as in ai-native-development-specifications.
- Use non generic design agents like Lovable / v0 / Claude Design, or at
  least provide good references for the coding agent.
- Close all mvp tags. It can be up to 100 issues (more is ok).
- Use persistent storage as SQLite, with DBMS agnostic tools like an ORM.
- Work in iterations: front end with mock service -> openapi.yml
  (contract) -> backend in-memory store -> backend SQLite storage ->
  connect frontend + backend.
- Add all .md files and this chat history to the repo.
- Actually run the app and test it thoroughly. Every bug found becomes a
  GitHub issue with the `user-test-bug` tag, groomed by pm.md, with test
  cases added by qa.md, and closed by qa-engineer.md.

---

## Part 2. Picking the idea

**Assistant:** Part I was Qobdisha
([240103087/qobdisha-ai](https://github.com/240103087/qobdisha-ai)).
Part II should be a different app: a real server and database, more than
one person touching the same data, and real rules, not just CRUD.
Three ideas:

- A) **Tabys** - a TrustMRR-style marketplace for small profitable online
  businesses: revenue history charts, valuation multiples, offers and
  counter-offers between buyer and seller
- B) **Live quiz** like Kahoot, players join from phones
- C) **Salon booking** with an engine for free slots

I'd take A.

**Sabina:** Let's have a different idea.

**Assistant:** Three more:

- A) **Bilet** - event tickets with a seat map, a 10-minute seat hold, a QR
  ticket and a door scanner
- B) **Joldas** - intercity ride sharing
- C) **Esep** - food cost for cafés: recipes, cost per portion, menu margin

**Sabina:** Let's make something useful for Kazakhstan.

**Assistant:**

- A) **Bizdin Úi** - for the owners' associations (ОСИ) every apartment
  building must now have: fees per m², debts, expense reports, online
  voting with a quorum by area
- B) **Toi Kitap** - a toi planner: RSVP by link, seating plan, budget and
  a book of who gave what
- C) **Joldas** - ride sharing between cities and to villages

**Sabina:** No, let's make an app for students.

**Assistant:**

- A) **Keste** - a course registration planner that builds every week
  without clashes and shows which friends are in the same groups
- B) **Ustaz** - student-to-student tutoring with slot booking and reviews
- C) **Bólme** - finding a flatmate with a compatibility score

**Sabina:** No, wait. Here is the idea:

> **MoveEasy Memory Tags - a digital memory for physical things.** The
> idea of digital capsules carries over well to the physical world (moving
> house, gifts, keeping memorable things).
>
> - What it is: a service that lets you attach digital "time capsules" or
>   instructions to real objects through QR codes.
> - How it is used: you give a physical gift or pack a box of memorable
>   things, stick a QR code on it, and when someone scans it they land in a
>   web app with a video greeting, the story of the thing, or a digital
>   photo album.
> - Key features:
>   - Generating unique QR codes for boxes and gifts.
>   - Attaching text, photos, video and voice messages.
>   - Privacy settings (access only with a password/PIN or a unique link).

**Assistant:** Good idea, and it is not trivial: public pages for people
without accounts, file uploads, privacy rules enforced by the server, and
printing. I'll narrow it down with a few questions and answer them myself
with the reasoning, so you can change any answer in `_docs/plan.md`.

---

## Part 3. Narrowing it down, one question at a time

**Assistant:** Q1. What kinds of things get a tag?

- A) Gifts only
- B) Gifts, moving boxes and keepsakes, each with its own fields
- C) Anything, no kinds

**Answer:** B. The name says "MoveEasy", so moving boxes are first class:
a box has a number, a room, a contents list and a fragile flag. A gift has
a recipient. A keepsake has a story. Kinds also drive the label layout.

**Assistant:** Q2. Who needs an account?

- A) Both the person who makes the tag and the person who scans it
- B) Only the owner. Scanning works for anyone with a phone camera

**Answer:** B. Nobody installs an app or signs up to open a gift.

**Assistant:** Q3. What does a QR code point to?

- A) A long random URL
- B) A short code, `/t/7KQ4M2XP`, 8 characters without look-alikes
  (no 0/O, 1/I/L), so it can also be typed by hand from the label

**Answer:** B. The code never changes, because it is already printed.
Regenerating a code is post-MVP.

**Assistant:** Q4. Privacy. Which modes?

- A) Public or PIN
- B) Public, PIN, private (owner only)
- C) B plus a time lock: the content opens only on a date

**Answer:** C. The time lock is what turns a tag into a "time capsule"
from the idea. The server must not send the content before the date,
otherwise anyone can read it in the network tab. A PIN is 4-6 digits,
stored hashed, and after 5 wrong tries the tag stops accepting PINs for 15
minutes.

**Assistant:** Q5. What media can be attached, and how big?

- A) Photos only
- B) Photos, video and audio files, with limits
- C) B plus recording a voice message right in the browser

**Answer:** C. Up to 20 items per tag. Photos up to 10 MB, audio 20 MB,
video 50 MB. Voice recording in the browser up to 3 minutes. Video
recording is post-MVP.

**Assistant:** Q6. Where are files kept?

- A) In the database as blobs
- B) On disk, with metadata in the database
- C) In S3

**Answer:** B. The database stays small and DBMS-agnostic. S3 is post-MVP.

**Assistant:** Q7. Can the person who scans answer?

- A) No
- B) Yes, a short reply with a name, if the owner turns replies on

**Answer:** B. "Thank you" is the natural response to a gift. With a spam
limit of 10 replies per tag per hour.

**Assistant:** Q8. How do moving boxes work together?

- A) Each box is on its own
- B) Boxes belong to a move; a move page groups boxes by room and has a
  search over contents: "where is my kettle?"

**Answer:** B. That search is the reason to tag boxes at all. Box numbers
are given automatically per move and never reused.

**Assistant:** Q9. How do people get the QR on a physical thing?

- A) Download a PNG and figure it out
- B) PNG and SVG download, plus a print page that lays out labels on A4 in
  three sizes, with the box number, room and FRAGILE on box labels

**Answer:** B. Printed through the browser's print dialog.

**Assistant:** Q10. What does the owner see?

- A) A list of tags
- B) A dashboard: tags as cards with scans and replies, search and
  filters, counters for tags, scans this week and unread replies

**Answer:** B. A scan is counted when a visitor opens an unlocked tag; the
owner's own previews do not count.

**Assistant:** Q11. Anything else for v1? NFC, emails on scan,
collaborators on a move, Russian and Kazakh interface?

**Answer:** No. All of them are post-MVP issues. v1 is: accounts, tags of
three kinds with media and privacy, time lock, public page with replies,
moves with search, QR download and label printing, dashboard. On a phone
and on a desktop.

**Assistant:** Saved as `_docs/plan.md`.

---

## Part 4. Combining the two articles

**Assistant:** The two articles start from different places. The
specifications article starts from a spec, turns it into a task list,
moves the tasks into GitHub issues, and has a PM, an engineer and a QA
agent work each issue. The full-stack article starts from a frontend made
by a design tool with a mocked services layer, derives `openapi.yaml` from
that layer, builds the backend against it with an in-memory store,
connects the frontend, then swaps the store for SQLite.

How they fit together:

- The spec, `AGENTS.md`, the role files, the task template and the issue
  lifecycle come from the specifications article. They are the "how we
  work".
- The order of the work comes from the full-stack article. Each of its
  stages is an iteration, and each iteration is a group of GitHub issues:
  (1) frontend with a mock service, (2) the OpenAPI contract, (3) backend
  with an in-memory store, (4) SQLite through an ORM, (5) frontend
  connected to the backend, then (6) the bug bash.
- The design tool step: the screens were drawn first in Claude Design (a
  canvas with the dashboard, the tag editor, the public pages on a phone,
  the move page and the label sheet), and `_docs/design-system.md` points
  the coding agent at it, with the tokens and the rules.
- Every issue is groomed by the PM, implemented by the engineer and checked
  by QA, whatever iteration it is in. QA closes it.
- Bugs found by running the app become `user-test-bug` issues, go through
  the same lifecycle, and QA adds a test case for each.

**Sabina's constraints mapped to the stack:**

- SQLite with a DBMS-agnostic tool: Prisma ORM. The store sits behind an
  interface, so the same API tests run against the in-memory store and
  against SQLite. Switching to Postgres is a change of `provider` and
  `DATABASE_URL`.
- Frontend: React + TypeScript + Vite, as in the article.
- Backend: Node + TypeScript + Express instead of FastAPI, so the whole
  project is one language and the rules (validation, privacy, time lock,
  contents search) are shared by the mock service and the real backend.

---

## Part 5. First prompts to the coding agent

1. "Read `_docs/plan.md`. Write `_docs/outdated/tasks.md`: one task per
   line of work, each with a number, a title, a one-line Goal and a
   two-to-three-sentence Description. Order them by the iterations. The
   first task sets up an empty project with one passing test."
2. "Review the tasks. Merge the ones that are too small, split the ones
   that will not fit in one session, and mark which are MVP. Move
   everything that is not MVP to the end."
3. "Create GitHub issues from the tasks with `gh`, labelled `mvp` or
   `post-mvp` and with their iteration. From now on the issues are the
   backlog."
4. "Write `AGENTS.md`, `_docs/process.md`, `_docs/task-template.md`,
   `_docs/bug-template.md` and the three role files in `_docs/team/`."
5. "Draw the main screens in Claude Design. Then write
   `_docs/design-system.md` from it."
6. "Work through the backlog: for each issue, PM grooms it, engineer
   implements it, QA verifies it and closes it on PASS."
