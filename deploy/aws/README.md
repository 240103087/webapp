# Deploy to AWS

One CloudFormation stack (`moveeasy-stack.yaml`, #74) creates:

- an EC2 instance (Amazon Linux 2023, `t3.micro` by default, 20 GB disk, 2 GB swap) running
  `docker compose` with three containers: the app, Postgres and Caddy
- an Elastic IP, so the address does not change when the instance restarts
- a security group open on 80 and 443 only. There is no SSH: you get a shell through
  AWS Systems Manager (Session Manager). Postgres is not reachable from the internet
- HTTPS by Caddy with a free Let's Encrypt certificate. Without a domain the address is
  `https://<elastic-ip>.sslip.io` (sslip.io resolves that name to the IP)
- an IAM role GitHub Actions assumes through OIDC to deploy every push to `main` (#75). It can
  read this stack's outputs and run a command on this one instance, nothing else

The production secrets (Postgres password, media signing key) are generated on the instance at
first boot and stay in `/opt/moveeasy/.env`. Nothing secret is in the repository, the template
or GitHub.

```
 browser --HTTPS--> Caddy :443 --> app :8787 --> Postgres :5432
                    (EC2 instance, docker compose, deploy/docker-compose.prod.yaml)
 GitHub Actions --OIDC--> DeployRole --SSM Run Command--> deploy/aws/deploy.sh <commit>
```

## 1. Create the stack (once)

You need an AWS account. A user with admin rights is fine for this first step; after it,
deploys run through the restricted `DeployRole`.

**In the AWS console** (no CLI needed):

1. Pick a region in the top right, for example `eu-central-1` (Frankfurt). Remember it
2. Open **CloudFormation > Create stack > With new resources**
3. **Upload a template file**: `deploy/aws/moveeasy-stack.yaml` from this repository
4. Stack name: `moveeasy`. Keep the default parameters. Set `CreateGitHubOidcProvider` to
   `false` only if the account already has the GitHub identity provider (IAM > Identity
   providers lists `token.actions.githubusercontent.com`)
5. On the last page tick **I acknowledge that AWS CloudFormation might create IAM resources**,
   then **Submit**
6. Wait for `CREATE_COMPLETE` (about 3 minutes). The instance then installs Docker and builds
   the app: give it about 10 more minutes
7. **Outputs** tab: open `AppUrl`. Log in with the demo account `aigerim@example.com` /
   `password123`

**Or with the AWS CLI:**

```bash
aws cloudformation deploy --stack-name moveeasy \
  --template-file deploy/aws/moveeasy-stack.yaml --capabilities CAPABILITY_IAM
aws cloudformation describe-stacks --stack-name moveeasy --query "Stacks[0].Outputs" --output table
```

## 2. Turn on deploys from GitHub (once)

In the GitHub repository: **Settings > Secrets and variables > Actions > Variables > New
repository variable**:

| Variable | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | the `DeployRoleArn` output of the stack |
| `AWS_REGION` | the region of the stack, e.g. `eu-central-1` |
| `AWS_STACK_NAME` | only if the stack is not called `moveeasy` |

From then on every push to `main` that passes the tests is deployed, and the `deploy` job fails
if `https://<app>/api/health` does not answer 200 within 5 minutes. Without
`AWS_DEPLOY_ROLE_ARN` the job is skipped.

To deploy by hand: **Actions > CI > Run workflow** on `main`, or the Run Command below.

## Look inside the server

**Systems Manager > Session Manager > Start session**, pick the `moveeasy` instance:

```bash
sudo -i
tail -n 50 /var/log/moveeasy-setup.log         # first boot
cd /opt/moveeasy
docker compose -f docker-compose.yaml -f deploy/docker-compose.prod.yaml ps
docker compose -f docker-compose.yaml -f deploy/docker-compose.prod.yaml logs -f app
bash deploy/aws/deploy.sh main                 # deploy the latest main by hand
```

## Settings

- Your own domain: create an A record pointing at the `PublicIp` output, then update the stack
  with `DomainName` set, and change `DOMAIN` in `/opt/moveeasy/.env` and run
  `deploy/aws/deploy.sh`
- Demo data is loaded only into an empty database, so it never overwrites real data. To start
  without it, add `SEED=0` to `/opt/moveeasy/.env`
- Bigger instance: update the stack with `InstanceType=t3.small` if builds are slow

## Costs and clean-up

`t3.micro` and 20 GB of gp3 fit the AWS free tier / free credits for new accounts. The public
IPv4 address costs about $3.60 a month. Delete everything when you no longer need it (the data
is deleted too):

```bash
aws cloudformation delete-stack --stack-name moveeasy
aws cloudformation wait stack-delete-complete --stack-name moveeasy
```

or **CloudFormation > moveeasy > Delete**.

## Why this setup

It follows "Deploy a Full-Stack App with AI Coding Assistants": one instance with the app,
Postgres and Caddy, created by CloudFormation, deployed by GitHub Actions through an OIDC role.
That is fine for a proof of concept. A managed database (RDS) and media in S3 (#45) are the
next steps for real traffic.
