# Expense Insight Engine, Moneo
Moneo is a expense tracker but not like every other expense tracker out there. 
It help to record transactions, compare with it with previous month(s) and provide
an insight on why your money is less than that day from the previous month(s).
Not merely showing financial data, but clearly explaining what changed, 
why the user is worse or better off than at the same point last month, and 
which spending decisions had the greatest impact 

Coming up, stay tuned. 

*Inspire by founder's trying to take control of his income. 

## Local backend

Copy `.env.example` to `.env`, provide your PostgreSQL credentials, then run:

```bash
bun install
bun run db:migrate
bun run dev
```

`bun run db:migrate` applies pending migrations and regenerates Prisma Client. In development,
the interactive Scalar API reference is available at `http://localhost:3102/docs`.

Register with `POST /auth/register` or sign in with `POST /auth/login`. Both endpoints set an
HTTP-only session cookie that Scalar and the browser reuse for protected category, transaction,
and insight requests.
