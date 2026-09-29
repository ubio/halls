# Shared users instructions

Follow [root AGENTS.md](../../AGENTS.md). This package owns staff identity types, exact domain policy and a D1 provisioning adapter. It is not a central deployed user database.

Require verified Workspace identities at exactly `ub.io` or `ubio.ai`. Preserve email normalization, nonempty Google subject, existing roles, disabled-user denial and subject/email binding protections. Do not automatically convert contacts, HubSpot users or Beacon recipients into app accounts.

Database changes must remain compatible with the explicit adapter schema or include an app migration. Test real SQLite behavior, role preservation, attempted takeover, rename and disabled accounts. Check both consuming applications before release.
