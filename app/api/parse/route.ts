import { NextRequest, NextResponse } from "next/server";

// This is the "Understand the question -> Structure it as an experiment ->
// identify missing information" step. It's a single, tightly-scoped LLM call
// that must return strict JSON matching our schema — not a chat turn, and
// not free-form prose. The model's job is narrow: extract what's stated,
// propose a labeled default for what's reasonable to assume, and flag what
// genuinely needs to be asked.

const SYSTEM_PROMPT = `You are the parsing engine inside a trading-research tool.
A user asks a natural-language question about a trading idea (e.g. "Does buying NIFTY after a 1% fall work better in high-volatility periods?").
Your job: convert it into a structured experiment definition. You do NOT evaluate whether the idea is good — only structure it.

Rules:
- Only mark a field's "confirmed" as true if the user's wording actually states or tightly implies it.
- For anything not stated, still propose a sensible, clearly-labeled default (confirmed: false) with a one-line "reason" explaining why you chose it — never leave a field empty.
- entryThresholdPct should be negative for a "fall" (e.g. -1 for "falls 1%"), positive for a "rise".
- filterType must be one of: "high_volatility", "low_volatility", "none", "other".
- List up to 3 fields in clarifyingQuestions — the ones most likely to change the result if guessed wrong (typically holding period, exit rule, and test period or cost assumptions). Phrase them as direct questions to the user.
- missingFields should list the schema keys (e.g. "holdingPeriodDays") that were not stated by the user at all.
- Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this TypeScript shape:

{
  "instrument": {"value": string, "confirmed": boolean, "reason"?: string},
  "timeframe": {"value": string, "confirmed": boolean, "reason"?: string},
  "entryDescription": {"value": string, "confirmed": boolean, "reason"?: string},
  "entryThresholdPct": {"value": number, "confirmed": boolean, "reason"?: string},
  "filterType": {"value": "high_volatility"|"low_volatility"|"none"|"other", "confirmed": boolean, "reason"?: string},
  "filterDescription": {"value": string, "confirmed": boolean, "reason"?: string},
  "exitDescription": {"value": string, "confirmed": boolean, "reason"?: string},
  "holdingPeriodDays": {"value": number, "confirmed": boolean, "reason"?: string},
  "testPeriodYears": {"value": number, "confirmed": boolean, "reason"?: string},
  "costAssumptionBps": {"value": number, "confirmed": boolean, "reason"?: string},
  "question": {"value": string, "confirmed": boolean},
  "missingFields": string[],
  "clarifyingQuestions": string[]
}`;

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.trim().length < 4) {
      return NextResponse.json({ error: "Please enter a research question." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing GEMINI_API_KEY. See README for setup." },
        { status: 500 }
      );
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: question }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse the model's response into JSON.", raw },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
