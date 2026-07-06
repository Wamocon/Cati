# 1Cati API Specification

Status: active API contract
Last reviewed: 1 July 2026
Confidentiality: STRICTLY CONFIDENTIAL

## Purpose

This folder contains the canonical API specification for the local 1Cati web application. The API contract is used for developer review, API testing, Jira/Xray traceability and later external provider or client handover.

## Standard

The contract uses OpenAPI 3.2.0. This is the current published OpenAPI standard as of July 2026 and is suitable for human documentation, machine validation, API test generation and developer portal tooling.

## Files

| File | Use |
|---|---|
| `openapi.json` | Canonical machine-readable API contract. |

## Local Access

When the web app is running, the same specification is available at:

```text
http://127.0.0.1:3104/api/openapi
```

The static source file can also be opened directly from:

```text
docs/api/openapi.json
```

## Tool Recommendation

Recommended workflow:

- Source of truth: OpenAPI 3.2 JSON in this repository.
- Local validation: `node scripts/validate-openapi.mjs`.
- API testing: Playwright `request` tests under `apps/web/e2e/api`.
- Documentation UI later: Redocly CLI/Redoc or Scalar API Reference.
- Jira/Xray evidence: JSON/JUnit results synced to Test Execution tickets after explicit approval.

Do not put production secrets, real tokens, customer private files or provider credentials into this API specification.
