# Contributing

Use this workflow for professional delivery and GitHub/Jira traceability.

## Branches

Create a branch before committing.

Recommended names:

- `feature/CATI-123-short-description`
- `fix/CATI-123-short-description`
- `chore/release-readiness-github-jira`

Do not commit directly to `main`.

## Commits

Keep commits focused and readable. If the work belongs to a Jira ticket, include the issue key in the commit message.

Examples:

```text
CATI-123 add sales payment plan dashboard
chore: prepare repository for GitHub delivery
```

## Pull Requests

Every pull request should include:

- business summary
- technical summary
- Jira issue key or explanation if no Jira issue exists
- validation commands and results
- screenshots for UI changes
- risks or follow-up work

## Required Local Checks

Run the relevant checks before pushing:

```bash
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web build
pnpm --dir apps/web test:e2e -- --project=chromium
```

For the current phase package:

```bash
pnpm phase:06-09
```

## Security Rules

- Never commit `.env.local`, `.env.tooling.local`, tokens, API keys, passwords or local certificates.
- Use placeholders in `.env.example`.
- Keep generated QA screenshots and local browser caches out of Git.
- Store CI/Jira credentials as GitHub repository secrets.
