# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

[Vitest](https://vitest.dev) 5 in `server/`. The client (`client/reactjs/`) has no tests yet; CI only checks that it builds.

## Running tests

```bash
cd server && npm test
```

CI (`.github/workflows/test.yml`) runs the server type-check and tests, plus the client build, on every push and pull request.

## Test layers

- **Unit tests** (`server/tests/*.test.ts`): controllers and the image-generation module, with every external service mocked. Add one whenever you change a controller or `configs/ai.ts`.
- **Integration tests**: none yet. Candidates: routes + rate limiters through `supertest`, with an in-memory MongoDB.
- **Smoke tests**: after a deploy, generate one thumbnail on the live site.
- **E2E tests**: none yet.

## Conventions

- One test file per module: `tests/<module>.test.ts`.
- Mock MongoDB models, Cloudinary, Cloudflare (`fetch`) and Gemini with `vi.mock` / `vi.stubGlobal`. Tests must never call real services or read `.env`.
- Set Cloudflare settings per test with `vi.stubEnv`, and undo them with `vi.unstubAllEnvs()`.
- Assert on what the user gets (status code, message, saved URL), not on internals.
- `tests/` is excluded from `tsconfig.json` so it stays out of `dist/`. Type-check tests with:
  `npx tsc --noEmit --ignoreConfig --module nodenext --moduleResolution nodenext --target ES2022 --strict --esModuleInterop --skipLibCheck server.ts tests/*.ts`
