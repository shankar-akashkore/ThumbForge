# TODOS

## Deploy

### Set the new server environment variables on Vercel

**What:** Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, and set `CLOUDINARY_URL` to the Root-key value, in the Vercel server project.

**Why:** Without them, live generation falls back to Gemini (which has no free image tier) and uploads fail with Cloudinary's "missing permissions (create)" error.

**Context:** v0.1.0.0 switched image generation to Cloudflare Workers AI. The ThumbForge Cloudinary key has no upload permission; the Root key does. Redeploy after saving the variables.

**Effort:** S
**Priority:** P0
**Depends on:** None

### Check the Vercel function time limit

**What:** Confirm the server function may run for at least 60 seconds (Vercel → server project → Settings → Functions, or `maxDuration`).

**Why:** A generation takes 20–40 seconds (FLUX.2 Klein ~20 s, plus fallback and generative fill). If the limit is 10 seconds, every live generation times out.

**Context:** `server/vercel.json` uses the legacy `builds` config with `@vercel/node`. Generate one thumbnail on the live site right after deploying; a timeout there means this limit.

**Effort:** S
**Priority:** P1
**Depends on:** Set the new server environment variables on Vercel

## Server

### Make generation limits a hard cap

**What:** Store per-user generation counts (or credits) in MongoDB instead of express-rate-limit's in-memory store.

**Why:** On Vercel each function instance keeps its own counter, so the 10-per-hour limit slows abuse but isn't a hard cap on the free Cloudflare allowance.

**Context:** Limiter lives in `server/routes/ThumbnailRoutes.ts`. A `generations` counter on the User model, checked and incremented atomically, would do it.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Delete the Cloudinary image when a thumbnail is deleted

**What:** Call `cloudinary.uploader.destroy(public_id)` in `deleteThumbnail`.

**Why:** Deleted thumbnails keep using Cloudinary storage and stay reachable by URL.

**Context:** `server/controllers/ThumbnailController.ts`. The public ID can be parsed from `image_url` or stored at upload time (`uploadResult.public_id`).

**Effort:** S
**Priority:** P2
**Depends on:** None

### Return 404 for malformed thumbnail IDs

**What:** Check `mongoose.isValidObjectId(id)` in delete and get-by-id before querying.

**Why:** A malformed ID currently returns 500 with Mongoose's "Cast to ObjectId failed" message.

**Context:** `deleteThumbnail` in `ThumbnailController.ts`, `getThumbnailbyId` in `UserController.ts`.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Validate generation input on the server

**What:** Reject titles over 100 characters and unknown style or color-scheme values in `generateThumbnail`.

**Why:** Only the client enforces these limits; a direct API call can send anything.

**Context:** The aspect ratio is already allowlisted in `ThumbnailController.ts`.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Remove unused dependencies and fix audit advisories

**What:** Remove `ts-node` from the server, `toast`, `react-hot` and `react-toastify` from the client, then run `npm audit fix` in both.

**Why:** `npm audit` reports advisories in body-parser, qs, mongoose and protobufjs (via `@google/genai`).

**Context:** Run the tests (`cd server && npm test`) and the client build after updating.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Use a least-privilege Cloudinary key in production

**What:** Create a Cloudinary API key that can upload but not administer the account, and use it instead of the Root key.

**Why:** The Root key can delete every asset in the account if it ever leaks.

**Context:** Cloudinary Console → Settings → API Keys / Role Management.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Data

### Clean up two stuck "Generating" records

**What:** Delete the thumbnails "Top smartwatch under 1499" (2026-05-05) and "Earbuds" (2026-05-16), which have `isGenerating: true` and no image.

**Why:** They show a "Generating..." card forever for their owner. The old code left them behind when generation failed; new failures clean up after themselves.

**Context:** Both belong to another user account. Delete in Atlas Data Explorer (`thumbforge.thumbnails`, filter `{isGenerating: true}`).

**Effort:** S
**Priority:** P3
**Depends on:** None

## Client

### Add client tests

**What:** Set up Vitest + Testing Library in `client/reactjs/` and cover the preview page's escaping/Cloudinary allowlist and Generate's error handling.

**Why:** The preview XSS fix and Generate's double-submit guard are only verified by hand.

**Context:** See TESTING.md. Add `typescript` to the client's devDependencies so it can type-check too (it currently has none).

**Effort:** M
**Priority:** P2
**Depends on:** None

### Tidy the repository

**What:** Remove `server/dist/` from git, delete tracked `.DS_Store` files, the empty root `package-lock.json`, and the duplicate `client/reactjs/src/assets 2/` folder (after moving what `YtPreview.tsx` imports), and fix the unused imports in `ColorSchemesSelector.tsx` and `StyleSelector.tsx`.

**Why:** `server/dist/` isn't used by Vercel and goes stale; the rest is clutter that confuses tooling.

**Context:** `server/vercel.json` builds `server.ts` directly.

**Effort:** S
**Priority:** P4
**Depends on:** None

## Completed
