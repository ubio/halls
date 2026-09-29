# Shared UI instructions

Follow [root AGENTS.md](../../AGENTS.md) and [development guide](../../docs/development.md). Own reusable primitives, UBIO brand marks, tokens, mobile hook and class-name utility only.

Do not import app internals, fetch business data or encode app-specific permission logic here. Use relative imports within this package and public subpath exports in consumers. Keep interactive client boundaries, accessibility and ref forwarding consistent with the underlying primitives.

Maintain Source Sans 3, hexagonal marks and common tokens. Orbit is the canonical visual reference. Both apps consume `workspace.css`; change common spacing, type, colors and component geometry there once. Do not introduce app-local overrides for shared shell/field/table selectors. Import the shared `fonts.css` in every app; keep its licensed variable-font assets bundled through Vite. Do not introduce app-local font loaders or cached filesystem URLs. Business layout and domain-specific presentation stay app-owned. Export changes or token/scanning changes require both app typechecks and builds. Avoid duplicating components back into applications.

Collection search uses the public `FilterSearch` component. Add field/value metadata in the owning app; keep business filtering, authorization and pagination out of shared UI. Use functional filter-map updates so clearing multiple chips is atomic from the user's perspective. Follow [search and navigation](../../docs/search-and-navigation.md) for the keyboard, scope and future-app contract. Check both apps for style leakage, popup clipping and mobile overflow.

Never use native `<select multiple>` controls. For multi-value form fields, use a searchable choice control with visible selected chips and individual remove buttons, or a small labelled checkbox group. Use `MultiChoice` from the shared UI package for searchable form selections.
