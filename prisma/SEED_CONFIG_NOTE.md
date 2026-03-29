# Seed Script Configuration

The following block must be present in `package.json` so that
`prisma db seed` / `pnpm prisma db seed` can locate and execute the seed script:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

`tsx` is used because the seed file is TypeScript and does not require a
separate compilation step.  Make sure `tsx` is listed in `devDependencies`.

## Running the seed

```bash
# Apply migrations (creates the schema) then seed
pnpm prisma migrate dev

# Seed only (schema already applied)
pnpm prisma db seed
```
