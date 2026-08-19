# Pull request previews

Every pull request gets an isolated Sealed Lists application in a dedicated Dokploy staging environment. Production remains a separate application and is never used as the parent or destination for previews.

The repository calls ras-stack's standard Dokploy preview workflows with its package, port, and environment template. The shared workflow publishes a commit-specific image alongside production images as `ghcr.io/richardsolomou/sealed-lists:preview-pr-<number>-sha-<commit>`, resolves its digest, and deploys it at `https://sealed-lists-pr-<number>.ras.sh`. Cloudflare proxies the hostname to Dokploy, so the origin firewall remains restricted to Cloudflare traffic and the existing `*.ras.sh` certificate covers every preview.

The URL stays stable for the lifetime of the pull request while each push replaces the deployed image behind it.

Each deployment has an empty, ephemeral SQLite database and newly generated Centrifugo secrets. It has no production volume, application secrets, email credentials, sign-in providers, or production list data. Create a disposable account with a unique password and never enter real lists or credentials.

Fork builds receive no repository secrets. They produce an image artifact in an untrusted workflow; the repository-owned `workflow_run` publishes and deploys it only after workflow approval.

Closing or merging a pull request deletes its Dokploy application and preview images. A weekly sweep removes applications and images left behind by failed cleanup runs.

## Setup

Create a dedicated staging environment in Dokploy and expose its ID as the standard `DOKPLOY_ENVIRONMENT_ID` GitHub Actions secret. This can be an organization secret shared with every Dokploy repository. Do not use the production environment ID. Dokploy must have its public server IP configured so the workflow can point preview DNS at it.

The preview workflows also use the production deployment's `DOKPLOY_URL` and `DOKPLOY_API_KEY`. Add `CLOUDFLARE_API_TOKEN` with DNS Write access limited to the `ras.sh` zone; ras-stack creates proxied, ownership-marked records and removes them when previews close or are pruned. If the GHCR package is private, add `PREVIEW_REGISTRY_USERNAME` and `PREVIEW_REGISTRY_PASSWORD`; public packages need neither.
