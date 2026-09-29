# Shared auth instructions

Follow [root AGENTS.md](../../AGENTS.md). This package implements Google protocol validation, not application routes, sessions or roles. Keep its API narrow and Worker-compatible.

Never weaken signature/algorithm, issuer, audience, expiry, nonce, PKCE or verified Workspace checks. Basic login must not acquire Gmail scopes by default. Extra scopes require explicit app consent parameters.

Tests use signed synthetic tokens and mocked public-key/token transport. Add adversarial cases for changed validation behavior. Run auth/users tests, both app typechecks and both builds when changing exports or verification contracts. Do not log tokens or secrets.
