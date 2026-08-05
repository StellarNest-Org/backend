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

