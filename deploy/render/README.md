# Deploy to Render: dev and prod (#98, #101, #102)

Two web services on Render's free plan, both described in [`render.yaml`](../../render.yaml) (a Render
"Blueprint"), both running the image that CI built once and pushed to GitHub Container Registry:

| Service | Gets a new version | Data |
|---|---|---|
| `moveeasy-dev` | every green commit on `main` (CI job "Deploy to dev") | SQLite in the container, demo data on every start |
| `moveeasy-prod` | only from Actions > "Promote dev to prod" | the free Postgres `moveeasy-db` |

Render never builds and never deploys from git: CI calls each service's deploy hook with an exact image tag
(`ghcr.io/240103087/webapp:20261115-130501-abc1234`). The whole picture is in [`_docs/devops.md`](../../_docs/devops.md).

## Set it up (once)

1. Merge to `main` and wait for CI: the job "Build the image once and push it" pushes the first image, tagged
   `dev` and, the first time only, `prod`
2. Make the image public, so Render can pull it: GitHub > your profile > Packages > `webapp` > Package settings >
   Change visibility > Public
3. Render > **Blueprints** > the `webapp` Blueprint > **Sync** (or New > Blueprint for a new account). It creates
   `moveeasy-dev` and `moveeasy-prod` and keeps `moveeasy-db`. The old `moveeasy` service (built from the
   Dockerfile, #98) is no longer in the Blueprint: delete it in its Settings
4. On each new service: Settings > **Deploy Hook** > copy. In GitHub > Settings > Secrets and variables > Actions,
   add `RENDER_DEPLOY_HOOK_DEV` and `RENDER_DEPLOY_HOOK_PROD`
5. If Render gave a service another address (a suffix like `moveeasy-dev-x1y2`), add the repository variables
   `DEV_URL` and `PROD_URL`
6. For telemetry, set `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` on both services
   (`_docs/devops.md`, Grafana Cloud)

`https://moveeasy-dev.onrender.com/api/health` answers `{"ok":true,"environment":"dev","version":"..."}`.

## Limits of the free plan

| Limit | What it means here |
|---|---|
| A service sleeps after 15 minutes without visits | The first visit after a pause takes about a minute; the deploy jobs wait up to 15 minutes |
| No persistent disk | Uploaded photos, videos and voice messages are lost when a service restarts or redeploys. dev also loses its SQLite data |
| The free database expires 30 days after it is created | Recreate it, or upgrade, before then |

Production on AWS with CloudFormation (`deploy/aws/README.md`) is unchanged and still deployed by hand.
