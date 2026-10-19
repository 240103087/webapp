# MoveEasy Memory Tags

QR codes on gifts, moving boxes and keepsakes. Scanning one opens a page
with a message, photos, a video or a voice message. Boxes belong to a
move, and the move page answers "where is my kettle?".

Specification: [`_docs/plan.md`](_docs/plan.md). How the project is run:
[`AGENTS.md`](AGENTS.md) and [`_docs/process.md`](_docs/process.md).

## Data

The backend stores data in SQLite through Prisma and media files in a
folder on disk.

| Setting | Default |
|---------|---------|
| `DATABASE_URL` | `file:<repo>/backend/data/moveeasy.db` |
| `UPLOAD_DIR` | `<repo>/backend/data/uploads` |
| `STORE` | `prisma` (`memory` keeps everything in memory and loses it on restart) |

On start the server applies migrations and, if the database is empty,
loads the demo data. Data and files survive a restart.

- `npm run db:migrate` - apply migrations
- `npm run db:seed` - **reset**: delete all data and uploaded files and
  load the demo data again

Demo accounts: `aigerim@example.com` and `dana@example.com`, password
`password123`.
