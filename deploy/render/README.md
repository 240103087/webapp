# Deploy to Render (#98)

The first, simple deploy: Render builds the same `Dockerfile` that Docker Compose uses and gives it a
managed Postgres database instead of the `db` service in `docker-compose.yaml`. Everything is in
[`render.yaml`](../../render.yaml) at the root (a Render "Blueprint"). Only free plans are used.

## Create it (once, about 10 minutes)

1. Sign in at https://render.com with GitHub (no card needed for the free plan)
2. **New > Blueprint**, pick the `webapp` repository, branch `main`
3. Render reads `render.yaml` and shows two resources: the web service `moveeasy` and the
   database `moveeasy-db`. Press **Deploy Blueprint**
4. Wait for the first build (5-10 minutes). The address is shown on the service page, like
   `https://moveeasy-xxxx.onrender.com`. Open `/api/health`: it answers `{"ok":true}`

On the first start the app applies the Postgres migrations and loads the demo data, so the demo
accounts from the main README work.

## Redeploy on every commit

`autoDeployTrigger: checksPass` makes Render deploy every commit to `main`, but only after the
GitHub Actions checks of that commit pass (tests, build, end-to-end, the Compose stack). A red
commit is never deployed.

## Limits of the free plan

| Limit | What it means here |
|---|---|
| The service sleeps after 15 minutes without visits | The first visit after a pause takes about a minute |
| No persistent disk | Uploaded photos, videos and voice messages are lost when the service restarts or redeploys. The demo files are copied again on start. On AWS (`deploy/aws/`) uploads live in a Docker volume |
| The free database expires 30 days after it is created | Recreate it, or upgrade, before then |

Production runs on AWS with CloudFormation (`deploy/aws/README.md`); Render is the quick first deploy.
