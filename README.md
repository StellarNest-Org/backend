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

## Stack

NestJS 11 · GraphQL (code-first, Apollo Server 5 via `@nestjs/apollo`) ·
Prisma 6 / PostgreSQL · `@stellar/stellar-sdk` 16 · JWT auth
(`passport-jwt`, `bcryptjs`) · `@nestjs/schedule` for recurring
bill-reminder jobs · `class-validator` / `class-transformer` for input
validation.

## Architecture

```
src/
  auth/            signup/signin, JWT issuance, Stellar address linking
  families/        family creation, membership, role assignment
  treasury/        treasury metadata, dashboard aggregation, freeze toggle
  rules/           withdrawal requests/approvals, automations (rules engine)
  savings-goals/   named savings goals with progress tracking
  bills/           recurring bills, due/overdue reminder cron
  investments/     investment holdings + portfolio profit/loss
  inheritance/     inheritance vault, beneficiaries, dead-man switch
  stellar/         non-custodial XDR builder + submitter for the treasury contract
  prisma/          PrismaService (a thin, injectable wrapper over @prisma/client)
```

Each feature module follows the same shape: a `*.service.ts` with the
actual Prisma queries and authorization checks, a `*.resolver.ts`
exposing it over GraphQL, `dto/` input types (validated with
`class-validator`), and `models/` GraphQL output types. `families` is a
dependency of almost every other module — most write operations check
`FamiliesService.assertAdmin()` (Owner/Parent) or
`FamiliesService.requireMembership()` before touching data.

Every module that touches money defers final authority to the on-chain
`treasury` contract: this API keeps a fast, queryable **off-chain mirror**
of on-chain state (for dashboards, notifications, and UX that shouldn't
have to wait on a ledger round-trip) — but the actual rules (approval
thresholds, spending limits, inheritance conditions) are enforced by the
Soroban contract itself, not by this service.

## Why an off-chain API at all

If the contract is the source of truth, why have a backend? Three
reasons:

1. **Speed.** Rendering a dashboard by simulating a dozen contract calls
   on every page load doesn't scale. Prisma caches a queryable mirror so
   `treasuryDashboard` is one aggregation query, not N ledger reads.
2. **Off-chain-only data.** Bill payee names, legal notes on an
   inheritance vault, a family's display name — none of this belongs on
   a public ledger, but it's exactly what a family-facing UI needs.
3. **Coordination.** Approval requests need somewhere to live *before*
   they're on-chain (so the UI can show "1 of 2 approvals" as people
   sign), and the `rules` module's `WithdrawalRequest`/`Approval` models
   exist for exactly that — a staging area that mirrors, and eventually
   gets confirmed by, the contract's own pending-withdrawal state.

## Non-custodial Stellar flow

`POST /stellar/build` returns **unsigned** XDR for a treasury contract
call. The client signs it with Freighter, a hardware wallet, or a passkey
signer, then posts the signed envelope to `POST /stellar/submit`. The
backend never receives, stores, or has the ability to reconstruct a
user's secret key — see `src/stellar/stellar.service.ts`, which wraps
`@stellar/stellar-sdk`'s `rpc.Server`, `Contract`, and
`TransactionBuilder` to simulate, prepare, and (once signed) submit
transactions against the deployed `treasury` contract.

```
 ┌──────────┐   1. build unsigned XDR    ┌─────────┐   3. simulate + prepare   ┌──────────────┐
 │ Frontend │ ─────────────────────────▶ │ Backend │ ────────────────────────▶│ Soroban RPC   │
 └──────────┘                            └─────────┘                          └──────────────┘
      │  2. sign with Freighter /                │
      │     hardware wallet / passkey             │
      ▼                                            │
 ┌──────────┐   4. submit signed XDR     ┌─────────┐   5. send to network      ┌──────────────┐
 │ Frontend │ ─────────────────────────▶ │ Backend │ ────────────────────────▶│ treasury      │
 └──────────┘                            └─────────┘                          │ contract      │
                                                                                └──────────────┘
```

## Environment variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string used by Prisma |
| `JWT_SECRET` | Signs and verifies session JWTs |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint (defaults to Stellar's public testnet RPC) |
| `STELLAR_NETWORK_PASSPHRASE` | Network passphrase used when building/submitting transactions |
| `TREASURY_CONTRACT_ID` | The deployed `treasury` contract's id — see [`contracts`](https://github.com/StellarNest-Org/contracts) |
| `STELLAR_READ_SOURCE_ACCOUNT` | A funded account used as the simulation source for read-only contract calls |
| `CORS_ORIGIN` | Comma-separated list of allowed origins (defaults to the frontend's dev URL) |
| `PORT` | HTTP port (default `4000`) |

## Getting started

```bash
cp .env.example .env
docker compose up -d          # starts Postgres 16 on localhost:5432
npm install
npx prisma generate           # generates the Prisma client from schema.prisma
npx prisma migrate deploy     # applies prisma/migrations
npm run start:dev             # http://localhost:4000/graphql
```

`npm run start:dev` runs Nest in watch mode. The GraphQL schema is
generated **code-first** — written as TypeScript decorators in each
module's resolver/model files, not hand-authored SDL — and printed to
`src/schema.gql` on boot (gitignored; regenerated every start). Open
`http://localhost:4000/graphql` for the interactive Apollo sandbox once
the server is running.

```bash
npm test          # unit tests (Jest, Prisma mocked — no DB required)
npm run lint       # ESLint (flat config)
npm run build      # tsc build to dist/
```

## GraphQL API reference

All resolvers except `signUp`/`signIn` require a `Bearer` JWT
(`Authorization: Bearer <token>`), enforced by `JwtAuthGuard`. Below is
every query and mutation exposed today, grouped by module.

**Auth** (`src/auth`)
```graphql
mutation { signUp(input: { email: "amara@family.com", password: "••••••••", displayName: "Amara" }) { accessToken } }
mutation { signIn(input: { email: "amara@family.com", password: "••••••••" }) { accessToken } }
```

**Families** (`src/families`)
```graphql
query   { myFamilies { id name members { displayName role } } }
query   { family(id: "fam_1") { id name members { userId role spendingLimit } } }
mutation{ createFamily(input: { name: "Adeyemi Family" }) { id } }
mutation{ addFamilyMember(input: { familyId: "fam_1", email: "chidi@family.com", displayName: "Chidi", role: PARENT }) { members { displayName role } } }
mutation{ updateFamilyMemberRole(input: { memberId: "mem_1", role: GUARDIAN }) { id } }
```

**Treasury** (`src/treasury`)
```graphql
query   { treasuryByFamily(familyId: "fam_1") { id contractAddress balance: approvalThreshold } }
query   { treasuryDashboard(treasuryId: "trs_1") { totalBalance totalSavings billsDueThisMonth investmentsValue monthlySpending upcomingTransfers inheritanceStatus pendingApprovals } }
mutation{ createTreasury(input: { familyId: "fam_1", name: "Adeyemi Family Treasury", assetCode: USDC, approvalThreshold: 1000, requiredApprovals: 2 }) { id } }
mutation{ recordOnChainTreasury(input: { treasuryId: "trs_1", contractTreasuryId: "1", contractAddress: "C..." }) { id } }
mutation{ setTreasuryFrozen(treasuryId: "trs_1", frozen: true) { frozen } }
```

**Rules** (`src/rules`) — withdrawal approvals and automations
```graphql
query   { withdrawalRequests(treasuryId: "trs_1") { id amount status approvalCount } }
mutation{ requestWithdrawal(input: { treasuryId: "trs_1", toAddress: "G...", amount: 500, reason: "Rent" }) { id status } }
mutation{ approveWithdrawal(withdrawalId: "wd_1") { status approvalCount } }
mutation{ setApprovalRule(input: { treasuryId: "trs_1", approvalThreshold: 1000, requiredApprovals: 2 }) }
query   { automations(treasuryId: "trs_1") { id type description nextRunAt active } }
mutation{ createAutomation(input: { treasuryId: "trs_1", type: RECURRING_SAVINGS, description: "Save $200 every payday", amount: 200, intervalDays: 14 }) { id } }
mutation{ toggleAutomation(automationId: "auto_1", active: false) { active } }
```

**Savings goals** (`src/savings-goals`)
```graphql
query   { savingsGoals(treasuryId: "trs_1") { id name targetAmount currentAmount progress } }
mutation{ createSavingsGoal(input: { treasuryId: "trs_1", name: "Emergency Fund", category: EMERGENCY_FUND, targetAmount: 5000 }) { id } }
mutation{ contributeToGoal(input: { goalId: "goal_1", amount: 250 }) { currentAmount progress } }
```

**Bills** (`src/bills`)
```graphql
query   { bills(treasuryId: "trs_1") { id name category amount nextDueAt status } }
mutation{ createBill(input: { treasuryId: "trs_1", name: "Rent", category: RENT, payeeName: "Landlord", payeeAddress: "G...", amount: 2200, intervalDays: 30 }) { id } }
mutation{ cancelBill(billId: "bill_1") { active status } }
```

**Investments** (`src/investments`)
```graphql
query   { portfolio(treasuryId: "trs_1") { totalValue totalProfitLoss totalProfitLossPercent holdings { assetCode category currentValue profitLoss } } }
mutation{ addInvestmentHolding(input: { treasuryId: "trs_1", assetCode: XLM, category: GROWTH, quantity: 10000, costBasis: 4200, currentValue: 5100 }) { id profitLoss } }
```

**Inheritance** (`src/inheritance`)
```graphql
query   { inheritanceVault(treasuryId: "trs_1") { timeLockAt deadManSwitchDays claimed beneficiaries { name allocationBps guardianApproved } } }
mutation{ createInheritanceVault(input: { treasuryId: "trs_1", timeLockAt: "2040-01-01T00:00:00Z", deadManSwitchDays: 365, guardianApprovalsRequired: 1, beneficiaries: [{ name: "Zainab", stellarAddress: "G...", allocationBps: 5000 }, { name: "Kene", stellarAddress: "G...", allocationBps: 5000 }] }) { id } }
mutation{ sendInheritanceHeartbeat(treasuryId: "trs_1") { lastHeartbeatAt } }
mutation{ approveInheritanceClaim(treasuryId: "trs_1", beneficiaryId: "ben_1") { beneficiaries { guardianApproved } } }
```

## REST: the Stellar signing flow

Two endpoints, both behind `JwtAuthGuard`, live outside GraphQL because
they move raw XDR strings rather than typed objects:

```http
POST /stellar/build
Content-Type: application/json

{
  "sourcePublicKey": "GABC...",
  "method": "request_withdrawal",
  "args": ["1", "GDEST...", "50000000"]
}
→ { "xdr": "AAAAAg..." }
```

```http
POST /stellar/submit
Content-Type: application/json

{ "signedXdr": "AAAAAg..." }
→ { "hash": "abcd1234...", "status": "SUCCESS" }
```

`method` must be one of the contract calls `StellarService` knows how to
encode arguments for: `create_treasury`, `deposit`,
`request_withdrawal`, `approve_withdrawal`, `contribute_to_goal`,
`heartbeat`, `claim_inheritance` (see
`src/stellar/dto/build-invocation.dto.ts`).

## Data model

See `prisma/schema.prisma` for the full model. Money fields are
`Decimal(20, 7)` to avoid floating-point drift (matching Stellar's 7
decimal places of precision); roles (`FamilyRole`) and asset codes
(`AssetCode`: `XLM`, `USDC`, `EURC`, `AQUA`, `CUSTOM`) are Postgres enums
shared between the GraphQL schema and the database via `@prisma/client`.

```
User ──< FamilyMember >── Family ── Treasury ──< SavingsGoal
                                        │      ├─< Bill
                                        │      ├─< WithdrawalRequest >── Approval
                                        │      ├─< InvestmentHolding
                                        │      ├─< Automation
                                        │      ├─< AuditLog
                                        │      └── InheritanceVault ──< Beneficiary
```

`Treasury.contractTreasuryId` / `contractAddress` link an off-chain row
to its on-chain counterpart once `recordOnChainTreasury` confirms
deployment; both are nullable because a treasury can exist off-chain
briefly before its on-chain creation transaction confirms.

## Testing

26 Jest unit tests across five spec files, all with `PrismaService` and
`FamiliesService` mocked (no database needed to run them):

- `auth.service.spec.ts` — sign-up conflict handling, password hashing,
  sign-in success/failure
- `families.service.spec.ts` — `assertAdmin` allows Owner/Parent, rejects
  every other role and non-members
- `rules.service.spec.ts` — auto-execute below threshold vs. pending
  above it, frozen-treasury blocking, child spending-limit enforcement,
  viewer rejection, approval-count-triggers-execution, duplicate-approval
  rejection
- `savings-goals.service.spec.ts` — admin-only goal creation, contribution
  increments
- `inheritance.service.spec.ts` — allocation-sum validation, owner-only
  vault creation, `isClaimable` under time-lock / dead-man-switch /
  neither

```bash
npm test
npm run test:cov   # with coverage
```

## Deployment

```bash
docker build -t stellarnest-backend .
docker run -p 4000:4000 --env-file .env stellarnest-backend
```

The `Dockerfile` is a two-stage build: `npm ci` + `prisma generate` +
`npm run build` in the build stage, then a slim runtime image with only
production dependencies and the compiled `dist/`. Run
`npx prisma migrate deploy` against your production `DATABASE_URL`
before starting the container for the first time. `.github/workflows/ci.yml`
runs lint, unit tests, and a build against a throwaway Postgres service
container on every push/PR.

## Troubleshooting

- **`PrismaClientInitializationError: Can't reach database server`** —
  Postgres isn't running or `DATABASE_URL` is wrong; `docker compose up -d`
  and check the port matches `.env`.
- **GraphQL schema didn't update after editing a resolver** — restart
  `start:dev`; `src/schema.gql` is regenerated on boot, not hot-reloaded
  mid-request.
- **`/stellar/build` fails with a simulation error** — usually means
  `TREASURY_CONTRACT_ID` isn't set to a real deployed contract, or
  `STELLAR_READ_SOURCE_ACCOUNT` isn't funded on the target network.

## Contributing

Issues and PRs are welcome. Before opening a PR: `npm run lint`,
`npm test`, and `npm run build` should all pass. See
[`StellarNest-Org/contracts`](https://github.com/StellarNest-Org/contracts)
for the on-chain rules this API defers to, and
[`StellarNest-Org/frontend`](https://github.com/StellarNest-Org/frontend)
for the client that consumes this API.
