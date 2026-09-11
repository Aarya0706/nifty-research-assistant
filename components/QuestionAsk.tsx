"use client";

import { useState } from "react";

const EXAMPLES = [
  "Does buying NIFTY after a 1% fall work better during high-volatility periods?",
  "Does buying NIFTY after a sharp fall work?",
  "Is there an edge in buying NIFTY after 3 straight down days?",
];

export default function QuestionAsk({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (q: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [text, setText] = useState("");

  return (
    <div>
      <div className="entry-index mb-2">01 — ASK</div>
      <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-paper-100 mb-3">
        Turn a hunch into a testable question.
      </h1>
      <p className="text-paper-300 text-[15px] leading-relaxed mb-6 max-w-[60ch]">
        Describe a trading idea in plain language. We'll identify what's specific
        enough to test, what we'd have to assume, and what's still missing.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Does buying NIFTY after a 1% fall work better during high-volatility periods?"
        rows={3}
        className="w-full bg-ink-800 border border-ink-600 rounded-md px-4 py-3 text-paper-100 placeholder-paper-300/40 font-sans text-[15px] focus:outline-none focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 resize-none"
      />

      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="text-xs font-mono text-paper-300/70 border border-ink-600 rounded px-2.5 py-1 hover:border-teal-400/60 hover:text-teal-400 transition-colors"
          >
            {ex.length > 48 ? ex.slice(0, 45) + "…" : ex}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-rust-400 text-sm mt-3 font-mono">{error}</p>
      )}

      <button
        onClick={() => text.trim().length > 3 && onSubmit(text.trim())}
        disabled={loading || text.trim().length < 4}
        className="mt-6 inline-flex items-center gap-2 bg-amber-400 text-ink-950 font-medium text-sm px-5 py-2.5 rounded-md hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Structuring the question…" : "Structure this question"}
      </button>
    </div>
  );
}
