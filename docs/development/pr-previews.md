# Pull request previews

Every pull request gets an isolated Sealed Lists application in a dedicated Dokploy staging environment. Production remains a separate application and is never used as the parent or destination for previews.

The repository calls ras-stack's standard Dokploy preview workflows with its package, port, and environment template. The shared workflow publishes a commit-specific image alongside production images as `ghcr.io/richardsolomou/sealed-lists:preview-pr-<number>-sha-<commit>`, resolves its digest, asks Dokploy for an `sslip.io` hostname, and deploys it over HTTP. The pull request comment reports which commit is deploying and which commit is live; use its link because the generated hostname is not derived from the pull request number.

Dokploy reuses the generated hostname while its public server IP remains unchanged. If that IP changes, the workflow replaces the route only after the new hostname is healthy.

Each deployment has an empty, ephemeral SQLite database and newly generated Centrifugo secrets. It has no production volume, application secrets, email credentials, sign-in providers, or production list data. Preview traffic is not encrypted, so create a disposable account with a unique password and never enter real lists or credentials.

Fork builds receive no repository secrets. They produce an image artifact in an untrusted workflow; the repository-owned `workflow_run` publishes and deploys it only after workflow approval.

Closing or merging a pull request deletes its Dokploy application and preview images. A weekly sweep removes applications and images left behind by failed cleanup runs.

## Setup

Create a dedicated staging environment in Dokploy and expose its ID as the standard `DOKPLOY_ENVIRONMENT_ID` GitHub Actions secret. This can be an organization secret shared with every Dokploy repository. Do not use the production environment ID. Dokploy must have its public server IP configured so it can generate a routable `sslip.io` hostname; custom DNS and certificate issuance are not required.

The preview workflows also use the production deployment's `DOKPLOY_URL` and `DOKPLOY_API_KEY`. If the GHCR package is private, add `PREVIEW_REGISTRY_USERNAME` and `PREVIEW_REGISTRY_PASSWORD`; public packages need neither.
