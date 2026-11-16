# Security Policy

## Reporting a vulnerability

Please do not open a public issue for an unpatched vulnerability.

Use GitHub's private vulnerability reporting. If it is unavailable, open an issue asking for a private way to get in touch without including vulnerability details.

Include the affected revision, deployment setup, reproduction steps, impact, and any known workaround in the private report. We will coordinate a fix and agree on when to publish details.

## Supported versions

Security fixes are made against the latest revision on `main`. Back up the SQLite database and the session secret before upgrading: `BETTER_AUTH_SECRET`, or on older deployments `AUTH_SECRET` or `/data/auth.secret`. Before reporting a problem, update to the latest revision and check whether it still occurs.
