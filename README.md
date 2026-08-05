# <img src="assets/logo.svg" width="32" height="32" align="center" alt="" /> StellarNest — Backend

The API behind **StellarNest**, a family financial coordination platform on
Stellar. A NestJS + GraphQL service over a Postgres/Prisma data layer, with
a thin Stellar/Soroban integration layer that builds unsigned transactions
for the [`treasury`](https://github.com/StellarNest-Org/contracts) contract
and hands them to the client to sign — the backend never touches a user's
private key.

This is one of three StellarNest repos:

| Repo | Purpose |
|---|---|
| [`contracts`](https://github.com/StellarNest-Org/contracts) | The Soroban `treasury` contract |
| [`backend`](https://github.com/StellarNest-Org/backend) *(this repo)* | GraphQL API, Postgres data layer, non-custodial Stellar integration |
| [`frontend`](https://github.com/StellarNest-Org/frontend) | Marketing site + product preview (Next.js) |

## Table of contents

- [New to this stack? Start here](#new-to-this-stack-start-here)
- [Stack](#stack)
- [Architecture](#architecture)
- [Why an off-chain API at all](#why-an-off-chain-api-at-all)
- [Non-custodial Stellar flow](#non-custodial-stellar-flow)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [GraphQL API reference](#graphql-api-reference)
- [REST: the Stellar signing flow](#rest-the-stellar-signing-flow)
- [Data model](#data-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## New to this stack? Start here

A few concepts recur throughout this codebase. If any of these are new
to you, this section should be enough to follow the rest of the README:

- **NestJS** is a backend framework for Node.js/TypeScript, structured
  around **modules** (a feature area, e.g. `families/`), **services**
  (where the actual logic and database queries live), and either
  **controllers** (for REST endpoints) or **resolvers** (for GraphQL).
  If you've used Angular, the pattern — classes, decorators like
  `@Injectable()`, and dependency injection via constructor parameters —
  will feel familiar; it's explicitly modeled on it.
- **GraphQL** is an alternative to a typical REST API. Instead of many
  fixed endpoints (`GET /families/:id`, `GET /families/:id/members`,
  ...), there's a single endpoint (`/graphql`) and the client sends a
  **query** describing exactly which fields it wants back — so a mobile
  app and a web dashboard can each ask for only what they need from the
  same API, in one request instead of several. A **query** reads data; a
  **mutation** changes it. This project's schema is **code-first**:
  instead of writing GraphQL's schema language by hand, you write normal
  TypeScript classes with `@ObjectType()`/`@Field()`/`@InputType()`
  decorators (see any file under `models/` or `dto/`), and NestJS
  generates the schema from them automatically into `src/schema.gql`.
- **Prisma** is an ORM (object-relational mapper) — it turns the models
  defined in `prisma/schema.prisma` into a fully-typed TypeScript client
  (`this.prisma.family.findMany(...)`) instead of hand-written SQL, and
  manages schema changes over time as versioned **migrations**
  (`prisma/migrations/`).
- **JWT (JSON Web Token)** is how a logged-in user stays logged in
  between requests without the server keeping a session in memory: after
  `signIn`, the client gets back a signed token, sends it as
  `Authorization: Bearer <token>` on every future request, and
  `JwtAuthGuard`/`JwtStrategy` verify that signature to know who's
  calling — see `src/auth/`.
- **Why GraphQL *and* two plain REST endpoints?** `/stellar/build` and
  `/stellar/submit` move a raw XDR string (Stellar's binary-ish
  transaction format, base64-encoded) — there's no meaningful "pick
  which fields you want" for a blob of bytes, so a plain REST endpoint
  is simpler than forcing it through GraphQL's type system. Everything
  else — families, treasuries, savings goals, and so on — is
  structured data that benefits from GraphQL's field-selection.
- **"Non-custodial"** means this backend is never able to move a
  family's funds on its own, because it never has the private key that
  could authorize that. See [Non-custodial Stellar flow](#non-custodial-stellar-flow)
  below for exactly how that works, and the
  [contracts README's glossary](https://github.com/StellarNest-Org/contracts#new-to-stellarsoroban-start-here)
  for Stellar/Soroban-specific terms like XDR, ledger, and contract id.

