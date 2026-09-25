# Changelog

All notable changes to ThumbForge are documented here.

## [0.1.0.0] - 2026-09-25

### Added
- Free thumbnail generation: images now come from Cloudflare Workers AI's free daily allowance (about 100 thumbnails a day). If the Cloudflare settings aren't set, Gemini is used instead (paid).
- Titles with brand names (like "Buy Macbook") still generate. When the main model's safety filter blocks an image, a backup model makes it and Cloudinary's generative fill widens it to your chosen aspect ratio, with no side bars.
- Clicking Generate again gives a new image instead of repeating the same one for the same title.
- Rate limits: 10 generations per hour per account, and 10 login or sign-up attempts per 15 minutes per IP.
- 33 automated server tests, plus a GitHub Actions workflow that runs them, the server type-check and the client build on every push.

### Fixed
- You can no longer delete another user's thumbnails.
- The YouTube preview page can no longer run scripts injected through a crafted link.
- My Generations shows your thumbnails instead of loading placeholders forever.
- Download saves the image instead of opening it.
- A failed generation shows a readable error, re-enables the Generate button, and no longer leaves a "Generating..." card behind.
- Double-clicking Generate sends only one request.
- Opening a deleted thumbnail sends you back to Generate instead of a blank page.
- Wrong passwords and failed sign-ups now show an error message.
- "Forget password?" no longer submits the login form, and "My Generations" is spelled correctly.
- The server stops with a clear error when it can't reach the database, instead of hanging.

### Changed
- Image generation moved from OpenAI DALL-E 3 to Cloudflare Workers AI, with Gemini as the paid option. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (or `GEMINI_API_KEY`) on the server.
- Images upload straight to Cloudinary, so generation works on Vercel's read-only filesystem.
- The local dev server restarts automatically when `server/.env` changes.

### Removed
- The `openai` package.
