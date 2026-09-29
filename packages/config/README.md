# @oss-os/config

Strict TypeScript configuration for OSS OS. [Development](../../docs/development.md) · [Agent guide](AGENTS.md)

Every application/library can extend `../config/tsconfig.json`. It establishes ES2022, bundler module resolution, JSX, isolated modules, strict checking and no emit. Consumers add their own aliases, generated framework types, runtime types and include/exclude patterns.

This package contains no runtime code or deployment credentials. Changes affect all consumers; validate with root typechecking and both app builds.
