# @oss-os/auth

Shared Google OAuth primitives for OSS OS Workers. [Architecture](../../docs/architecture.md) · [Security contract](../../docs/security.md) · [Agent guide](AGENTS.md)

| Export | Contract |
| :-- | :-- |
| `createPKCE()` | Returns a random verifier and S256 challenge |
| `randomToken()` | Cryptographically random base64url token |
| `digest(value)` | SHA-256 hex digest |
| `googleAuthorizationURL(input)` | Basic login URL; explicit optional additional scopes/offline consent |
| `exchangeGoogleCode(input)` | Server-side bounded Google code exchange requiring an ID token |
| `verifyGoogleIdentityToken(token, clientId, nonce)` | Signature/claim/domain verification returning a normalized staff identity |

The app supplies its client ID, secret, callback, state and nonce. It owns browser binding, one-use state handling, session issuance and authorization. This package never reads an application's environment implicitly and never creates a login cookie.

Ordinary login requests only `openid email profile`. Gmail callers explicitly supply their scopes and offline consent. Keep that separation when adding integrations.

```sh
npm test --workspace @oss-os/auth
npm run typecheck --workspace @oss-os/auth
```

Tests use signed synthetic JWTs and mocked Google public keys. They cover claim/identity rejection and protocol parameters without production credentials.
