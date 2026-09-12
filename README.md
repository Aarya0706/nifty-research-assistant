# Ledger — AI Trading Research Assistant (Mini Prototype)

**Option chosen: Option 1 — AI Trading Research Assistant, Mini Prototype**

A small web prototype that turns a natural-language trading question into a
structured, testable experiment — and runs it against simulated data so the
user sees the whole loop end to end: **Ask → Clarify → Define → Test → Learn**.

## Live flow

1. **Ask** — user types a question like *"Does buying NIFTY after a 1% fall
   work better during high-volatility periods?"*
2. **Clarify & Define** — Gemini extracts a structured experiment (instrument,
   entry, filter, exit, holding period, test period, cost assumption). Every
   field is tagged **confirmed** (stated by the user) or **assumed** (the
   model's best-guess default, shown with its reasoning) so nothing important
   is silently invented. The user can edit any field or accept the assumption.
3. **Test** — the confirmed experiment is run against a synthetic,
   reproducible price series (not real market data — see *Key decisions*
   below) using a small deterministic backtest engine.
4. **Learn** — Claude explains the result in plain language, explicitly
   separating *what the data shows* (facts) from *what we conclude*
   (interpretation), plus a short list of ways the result could be
   misleading and what to investigate next.
5. Past experiments are remembered locally (browser storage) so a user can
   revisit earlier questions — a small nod to the "Remember what it learned"
   part of the long-term product vision.

## Architecture

```
app/
  page.tsx              orchestrates the ASK -> CLARIFY -> RESULTS state machine
  api/parse/route.ts     AI call #1: question -> structured Experiment JSON
  api/explain/route.ts   AI call #2: backtest stats -> plain-language explanation
components/
  QuestionAsk.tsx         step 1 UI
  ClarifyDefine.tsx        step 2 UI (editable structured fields)
  ResultsPanel.tsx         step 3/4 UI (stats + explanation)
  HistoryList.tsx           step 5 UI (localStorage history)
lib/
  experimentSchema.ts     shared TypeScript types for the structured experiment
  mockData.ts               synthetic price series generator (seeded PRNG)
  backtest.ts                deterministic backtest engine
```

Two separate, narrowly-scoped AI calls, not one open-ended chatbot loop:

- **`/api/parse`** — turns free text into strict JSON matching a fixed
  schema (Gemini's `responseMimeType: "application/json"` mode). The
  model's only job is extraction + flagging what it had to assume. It never
  runs the backtest or judges the strategy.
- **`/api/explain`** — takes the *computed* backtest numbers (produced by
  plain TypeScript, not the model) and writes a short, honest explanation
  of them. The model never invents numbers; it only interprets numbers it's
  given.

Everything in between — the structured-field UI, the backtest engine, the
history list — is deterministic application code. This was a deliberate
choice: the assignment specifically asks for AI used *meaningfully*, not a
"wrapper" where every step is just another prompt.

## Technologies used

- **Next.js 16 (App Router) + TypeScript** — API routes double as a thin
  backend, keeping the Gemini API key server-side only.
- **Tailwind CSS** — a small custom token set (see `tailwind.config.ts`) for
  a "research ledger" visual identity rather than default component-kit
  styling.
- **Google Gemini API** (`gemini-3.6-flash`, free tier via
  [Google AI Studio](https://aistudio.google.com/apikey)) — the two AI calls
  above, using `responseMimeType: "application/json"` for reliable
  structured output.
- **Zod** — runtime validation of both AI responses. A system prompt telling
  the model what shape to return is not a contract; `lib/experimentValidation.ts`
  is the actual enforcement point, rejecting malformed or out-of-range
  output (e.g. a non-numeric holding period) before it ever reaches the UI
  or the backtest engine.
- **Browser `localStorage`** — lightweight persistence for experiment
  history; no database needed for a prototype of this scope.

## Key decisions

- **Simulated data, clearly labeled.** There's no live market data feed in
  scope for a 3–4 hour prototype, and the brief explicitly allows
  simulated/mock data. Rather than hardcode a handful of fake numbers, I
  built a small seeded generator that produces index-like behavior (drift,
  volatility clustering, fat-tailed drops) so entry rules like "falls 1%"
  and filters like "high volatility" have something realistic to act on.
  The UI never claims this is real NIFTY history.
- **Assumptions are visible, not hidden.** Every field the model didn't get
  from the question is shown as "assumed," with a one-line reason, and
  requires either an edit or an explicit "accept" — this was the most
  important part of the "handling ambiguity" evaluation criterion, so it's
  the most carefully built part of the UI.
- **Data vs. interpretation, kept structurally separate.** "What the data
  shows" and "What we conclude" are two different fields in the AI's JSON
  response, not one paragraph — so the UI can never accidentally blend them.
- **The backtest result is saved independent of the AI explanation.**
  History is persisted as soon as the (deterministic, local) backtest
  completes — not gated behind the second Gemini call succeeding — so a
  transient AI outage doesn't lose a result that already finished computing.
- **No database.** `localStorage` is enough to demonstrate "remember what it
  learned" without adding infrastructure that isn't the point of this
  assignment.

## Running locally

```bash
npm install
cp .env.example .env.local   # add your free GEMINI_API_KEY (aistudio.google.com/apikey)
npm run dev
```

Open http://localhost:3000.

## What I'd improve with more time

- **Automated tests** around the backtest engine (threshold behavior, holding
  period, volatility filter, cost calculation, zero-trade edge cases) and the
  Zod schemas. None exist yet — for a 3–4 hour prototype I prioritized the
  end-to-end workflow over test coverage, but this is the most defensible
  next investment.
- **Statistical rigor in the results.** Right now "53% win rate over 234
  trades" is presented without a confidence interval — a bootstrap CI or at
  minimum a sample-size caveat would make the difference between 60% on 10
  trades and 60% on 1,000 trades explicit rather than implied.
- **Richer backtest statistics** — Sharpe ratio, max drawdown, an equity
  curve — instead of just avg return / win rate / best-worst. Deliberately
  kept minimal here since the assignment is scoped around the research
  *workflow*, not backtest sophistication, but this is the natural next
  layer.
- Replace the synthetic data generator with a real historical dataset (e.g.
  a public NIFTY daily-close CSV) behind the same backtest interface —
  the engine is already written against a generic `DailyBar[]`, so this is
  a data-layer swap, not a rewrite.
- Let the user ask a follow-up question against an existing result ("what if
  holding period were 10 days instead?") without re-typing the whole
  question — re-run the same experiment object with one field changed.
- Persist history server-side (per-user) instead of per-browser, once there's
  a reason to have accounts.
