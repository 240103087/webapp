# MoveEasy Memory Tags - specification

MoveEasy Memory Tags gives physical things a digital memory. You stick a
QR code on a gift, a moving box or a keepsake. Whoever scans it with a
phone camera opens a page with what you attached: a message, a story,
photos, a video, a voice message, or for a moving box, what is inside and
which room it goes to.

This file is the result of the brainstorm in `chat-brainstorm.md`.

## Who uses it

- **Owner** - has an account, creates tags, attaches content, prints QR
  labels, sees scans and replies
- **Visitor** - anyone who scans a QR code. No account. Sees the tag's
  page if the tag's privacy allows it

## Tags

A tag is one physical thing with one QR code.

- **Kind**: `gift`, `box` (moving box) or `keepsake`
- **Title** (1-80 chars), **message** (0-5000 chars, plain text with line
  breaks), optional **recipient name** ("For Aigerim")
- **Code**: 8 characters from an alphabet without look-alikes
  (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`), unique, random, set when the tag is
  created and never changes. The public link is `/t/<code>`
- **Theme**: one of 6 color themes for the public page
- **Box fields** (only for `box`): box number (auto, per move, 1, 2,
  3...), room (`Kitchen`, `Bedroom`...), contents (a list of up to 100
  items, each 1-80 chars), `fragile` flag
- **Move**: a `box` belongs to a **move** (a moving project: name, from
  address, to address, date). A move has its own page with every box
- **Status**: `active` or `archived`. An archived tag's QR page says the
  tag is no longer active
- **Allow replies**: on/off. When on, a visitor can leave a reply

## Media

- A tag has up to 20 media items: `photo` (JPEG, PNG, WebP, max 10 MB),
  `video` (MP4, WebM, max 50 MB), `audio` (MP3, M4A, WebM, OGG, WAV, max
  20 MB)
- Each item has an optional caption (0-200 chars) and a position. The
  owner can reorder and delete items
- The owner can record a voice message in the browser (microphone) instead
  of uploading a file, max 3 minutes
- Files are stored on the server's disk (a folder set by an env
  variable); the database stores only the metadata. Moving to S3 is
  post-MVP

## Privacy

Every tag has one of three privacy modes:

- **Public** - anyone with the QR code or link sees the page
- **PIN** - the visitor must enter a 4-6 digit PIN. The PIN is stored
  hashed. After 5 wrong PINs from the same browser session in 15 minutes,
  the tag refuses PINs for 15 minutes. A correct PIN gives an access token
  valid for 24 hours, so a reload does not ask again
- **Private** - only the owner sees it; a visitor sees "This tag is
  private"

And an optional **time lock** ("open on"): a date and time before which a
visitor sees only the title, the recipient name and a countdown. The
server does not send the message or the media before that time, whatever
the privacy mode. This is the "time capsule".

The owner always sees their own tag's page in preview mode.

## The public page `/t/<code>`

What a visitor sees, in order:

1. Unknown code: "No tag with this code"
2. Archived: "This tag is no longer active"
3. Private: "This tag is private"
4. Time-locked: title, recipient, countdown to the open date
5. PIN: a PIN form
6. Otherwise: the tag. Title, recipient, message, media gallery (photos
   open full screen, video and audio play in place). For a box: box
   number, room, fragile badge, contents list, and the move's name. A
   reply form if replies are on

A view of an unlocked tag counts as a **scan** (the owner's own previews
do not). The same visitor (one browser, identified by a random visitor id)
counts at most once per tag every 30 minutes, so reloads and React's
double loading in development do not inflate the number (#56). The owner sees the number of scans and the last scan
time.

**Replies**: a visitor leaves a name (1-60) and a message (1-1000). The
owner sees replies on the tag's page in the dashboard and can delete them.
Max 10 replies per tag per hour (spam guard).

## QR codes and labels

- The tag page in the dashboard shows the QR code, with download as PNG
  and SVG
- **Print labels**: pick tags (or a whole move), pick a label size
  (small 50 mm, medium 70 mm, large 100 mm), get a print-ready A4 page.
  Each label has the QR code, the title, and for a box the box number,
  room and a FRAGILE line. The page is printed with the browser's print
  dialog

## Moves

- An owner creates a move: name, from, to, date (all but name optional)
- On the move page: boxes grouped by room, with counts, and a search box:
  type "kettle", get every box whose contents mention it, with box number
  and room. "Where is my kettle?" is the main question during a move
- Box numbers inside a move start at 1 and never repeat, even after a box
  is deleted
- Deleting a move is allowed only when it has no boxes

## Dashboard

- All my tags as cards: title, kind, privacy, time lock, scans, replies,
  thumbnail of the first photo. Search by title, filter by kind and by
  move, sort by newest, most scanned
- Counters at the top: tags, scans this week, unread replies
- Create, edit, archive/unarchive, delete a tag (delete asks to confirm and
  removes its media)

## Accounts

- Sign up with name, email, password (min 8 chars). Log in, log out.
  Passwords hashed; a bearer token per session
- Seed data: two demo users with tags of every kind and privacy, a move
  with 12 boxes, demo photos

## Non-goals for v1 (post-MVP issues)

- NFC tags instead of QR
- Regenerating a tag's code (invalidating a printed QR)
- Email to the owner when a tag is scanned or replied to
- Collaborators (two people managing one move)
- Russian and Kazakh interface
- Storing files in S3
- Video recording in the browser
- Ordering printed stickers

## Stack

- `frontend/` - React + TypeScript + Vite, React Router, Vitest + Testing
  Library. All backend calls go through one services layer (`src/api/`)
  with two implementations: mock (in the browser) and HTTP
- `shared/` - pure TypeScript used by both sides: validation rules, code
  generator, privacy and time-lock rules, contents search
- `openapi.yaml` - the API contract, derived from the services layer
- `backend/` - Node + TypeScript + Express, Zod validation, a store
  interface with an in-memory implementation and a Prisma (SQLite)
  implementation, Vitest + Supertest
- `e2e/` - Playwright tests against the running app
- The database is chosen by `DATABASE_URL`. Nothing SQLite-specific is
  used, so Postgres is a provider change
