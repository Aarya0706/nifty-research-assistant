# AI Usage Note

**AI tools used:** Claude (in this chat-based coding environment) for building
the app itself. The app's own runtime AI calls (question parsing and result
explanation) use the Google Gemini API (`gemini-3.6-flash`, free tier).

**What I used it for:**
- Scaffolding the Next.js/TypeScript project structure (config files, routes,
  component boilerplate).
- Writing the synthetic price-series generator and backtest engine.
- Drafting the two system prompts used in `/api/parse` and `/api/explain`,
  and the UI copy.
- Running `tsc --noEmit` and `next build` to catch and fix type/build errors
  before calling it done.

**What I personally designed:**
- The overall product decision to split "understand the question" and
  "explain the result" into two separate, narrow AI calls that operate on a
  fixed schema — rather than one open-ended chat loop — so the AI's role
  stays meaningfully scoped instead of becoming a chatbot wrapper around the
  UI.
- The core UX rule that every field the model couldn't get from the question
  must be visibly marked "assumed" (with its reasoning shown) and require an
  explicit accept-or-edit, rather than silently defaulting.
- The decision to keep "what the data shows" and "what we conclude" as
  separate structured fields in the explanation response, so the UI can't
  blend fact and interpretation even by accident.
- The choice to build a small seeded synthetic-data generator (rather than
  a handful of hardcoded fake numbers) so the backtest has something
  realistic to respond to, while being explicit in the UI that it isn't
  real market history.

**What I reviewed or modified:**
- Tightened the extraction schema (`experimentSchema.ts`) so numeric fields
  (threshold %, holding days, cost bps) are normalized and typed — this is
  what makes the backtest engine deterministic and simple instead of having
  to parse free text at test time.
- Adjusted the backtest engine to skip overlapping trades while already in a
  position, so trade counts aren't inflated by re-triggering the same signal
  on consecutive days.
- Pinned the Next.js version to a patched release after the initial install
  flagged a known security advisory on the version first scaffolded.
