import { NextRequest, NextResponse } from "next/server";

// Second, distinct AI use in this prototype: turning raw backtest numbers
// into plain-language interpretation for a non-quant user — while keeping
// "what the data shows" (facts) clearly separate from "what we conclude"
// (interpretation, with appropriate hedging). This is the "Explain the
// result" step in the product's long-term vision.

const SYSTEM_PROMPT = `You explain trading-strategy backtest results to a user who is not a quant.
You will be given the structured experiment definition and summary statistics from a SIMULATED/MOCK backtest (not real market data).
Write a short, honest explanation. Respond with ONLY a JSON object, no markdown fences:

{
  "whatDataShows": string,      // 2-3 sentences, purely factual, only the numbers given
  "whatWeConclude": string,     // 2-3 sentences, your interpretation, hedged appropriately given this is mock data and a small/simple test
  "risksAndCaveats": string[],  // 3-5 short bullet points: things that could make this misleading (e.g. look-ahead bias, overfitting, small sample, real transaction costs/slippage, synthetic data not real history, regime dependence)
  "nextQuestions": string[]     // 2-3 short follow-up questions worth investigating next
}
Never claim the mock data reflects real NIFTY history. Be direct about limitations. Do not add commentary outside the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
          contents: [{ role: "user", parts: [{ text: JSON.stringify(body) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1536,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: 502 });
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
