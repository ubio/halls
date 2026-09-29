# UBIO Halls

Live student accommodation stock, read by A3 from each operator's own website, and bookings prepared against it.

Halls is the front end for UBIO's student accommodation vertical: the same model as Hotel Universe, for student rooms instead of hotel rooms. A3 reads every operator's rooms, prices, tenancy lengths and availability into a dataset; Halls shows it, and asks an A3 workflow to fill in an operator's booking form for a student, stopping before the final submit.

## What is in this repository

| Path | What it is |
| :-- | :-- |
| `packages/halls` | The app: a Cloudflare Worker with a React front end ([README](packages/halls/README.md)) |
| `packages/ui`, `packages/auth`, `packages/users`, `packages/config` | Copies of the shared OSS OS packages, so Halls looks, signs in and builds exactly like Orbit, Lens and Tide |

The shared packages are copied from [OSS OS](https://github.com/ubio) at the commit in `.oss-os-rev`. Do not edit them here; change them in OSS OS and copy them across again, updating `.oss-os-rev`, so the two do not drift.

## Running locally

```sh
npm install
cd packages/halls
npm run setup:local                         # writes .dev.vars with localhost mock login
npx wrangler d1 migrations apply DB --local
cd ../.. && npm run dev                     # http://localhost:3007
```

Choose **Continue as local developer**. Until an A3 dataset is connected the rooms are a fictional sample, and say so on screen.

## Checks

```sh
npm run check      # typecheck and tests, every package
npm run build
```
