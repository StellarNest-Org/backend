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

