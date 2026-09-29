# @oss-os/users

Shared UBIO staff identity policy and provisioning adapter. [Security](../../docs/security.md) · [Agent guide](AGENTS.md)

## Public entry points

`@oss-os/users` exports allowed domains, email/Workspace validation and profile types:

- `UserProfile`: normalized email and display name.
- `WorkspaceUser`: profile with application role.
- `GoogleIdentity`: verified Workspace profile with Google subject and hosted domain.
- `workspaceIdentity(payload)`: applies exact verified-domain policy to a previously signature-verified payload.

`workspaceIdentity` does not verify JWT signatures itself. App OAuth flows should normally call `verifyGoogleIdentityToken` from `@oss-os/auth`, which performs both steps.

## D1 adapter

```ts
import { D1UserDirectory } from '@oss-os/users/database';

// identity must come from verified server-side OAuth.
const user = await new D1UserDirectory(env.DB)
  .registerVerifiedIdentity(identity, 'member');
```

The supplied D1 binding must have a compatible `users` table containing `email`, `name`, `role`, `google_sub` and `active`, with unique email and Google-subject constraints. Orbit's schema is the existing reference. The adapter does not provision a database or apply migrations.

Provisioning preserves an existing role, updates a matching identity's name, rejects disabled users and prevents silent subject/email reassignment. Initial role is a server-side app decision, never a browser input.

Beacon consumes shared identity policy/profile types today, not this D1 adapter. This package is not a centralized staff directory service.

```sh
npm test --workspace @oss-os/users
npm run typecheck --workspace @oss-os/users
```
