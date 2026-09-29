# Shared configuration instructions

Follow [root AGENTS.md](../../AGENTS.md). Keep the TypeScript baseline strict and portable across packages. App aliases, generated types and Worker bindings belong in the app config. Do not put secrets, absolute paths or deployment identifiers here.

Changes affect the entire workspace: run root typechecking and both app builds. Do not suppress genuine type errors by relaxing strictness or broadly excluding source files.
