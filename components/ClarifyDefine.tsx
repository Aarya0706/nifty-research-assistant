"use client";

import { useState } from "react";
import { Experiment, FIELD_LABELS } from "@/lib/experimentSchema";

type Props = {
  question: string;
  experiment: Experiment;
  onConfirm: (exp: Experiment) => void;
  onBack: () => void;
};

const NUMERIC_FIELDS = new Set([
  "entryThresholdPct",
  "holdingPeriodDays",
  "testPeriodYears",
  "costAssumptionBps",
]);

// Keeps hand-edited numbers within ranges the backtest engine can sensibly
// act on — matches the bounds enforced server-side in experimentValidation.ts.
const NUMERIC_BOUNDS: Record<string, { min: number; max: number; step?: number }> = {
  entryThresholdPct: { min: -50, max: 50, step: 0.1 },
  holdingPeriodDays: { min: 1, max: 252, step: 1 },
  testPeriodYears: { min: 0.5, max: 30, step: 0.5 },
  costAssumptionBps: { min: 0, max: 500, step: 1 },
};

function clamp(key: string, n: number): number {
  const bounds = NUMERIC_BOUNDS[key];
  if (!bounds || Number.isNaN(n)) return n;
  return Math.min(bounds.max, Math.max(bounds.min, n));
}

const SELECT_FIELDS: Record<string, string[]> = {
  filterType: ["none", "high_volatility", "low_volatility", "other"],
};

export default function ClarifyDefine({ question, experiment, onConfirm, onBack }: Props) {
  const [exp, setExp] = useState<Experiment>(experiment);

  const fieldKeys = Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[];
  const unconfirmedCount = fieldKeys.filter((k) => !(exp as any)[k].confirmed).length;

  function updateField(key: string, value: any) {
    const finalValue = NUMERIC_FIELDS.has(key) ? clamp(key, value) : value;
    setExp((prev) => ({
      ...prev,
      [key]: { ...(prev as any)[key], value: finalValue, confirmed: true },
    }));
  }

  function acceptAssumption(key: string) {
    setExp((prev) => ({
      ...prev,
      [key]: { ...(prev as any)[key], confirmed: true },
    }));
  }

  return (
    <div>
      <div className="entry-index mb-2">02 — CLARIFY &amp; DEFINE</div>
      <h2 className="font-serif text-2xl sm:text-3xl text-paper-100 mb-1">
        Here's what we could pin down.
      </h2>
      <p className="text-paper-300/80 text-sm mb-1 max-w-[62ch]">
        "{question}"
      </p>
      <p className="text-paper-300 text-[15px] leading-relaxed mt-4 mb-6 max-w-[62ch]">
        {unconfirmedCount > 0
          ? `${unconfirmedCount} field${unconfirmedCount === 1 ? "" : "s"} below ${
              unconfirmedCount === 1 ? "is an assumption" : "are assumptions"
            }, not something you stated — amber means "please check this." Edit anything, or accept it and move on.`
          : "Everything below is confirmed. Review it, then run the experiment."}
      </p>

      {exp.clarifyingQuestions?.length > 0 && (
        <div className="mb-6 bg-ink-800 border border-rust-400/40 rounded-md px-4 py-3">
          <p className="text-rust-400 text-xs font-mono uppercase tracking-wide mb-2">
            Worth answering before you trust the result
          </p>
          <ul className="space-y-1">
            {exp.clarifyingQuestions.map((q, i) => (
              <li key={i} className="text-paper-100 text-sm leading-snug">
                · {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {fieldKeys.map((key) => {
          const field = (exp as any)[key];
          const label = FIELD_LABELS[key];
          const confirmed = field.confirmed;

          return (
            <div
              key={key}
              className={`rounded-md border px-4 py-3 transition-colors ${
                confirmed
                  ? "border-ink-600 bg-ink-800/60"
                  : "border-amber-400/50 bg-amber-400/5"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs uppercase tracking-wide text-paper-300/70">
                  {label}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    confirmed
                      ? "text-teal-400 bg-teal-400/10"
                      : "text-amber-400 bg-amber-400/10"
                  }`}
                >
                  {confirmed ? "confirmed" : "assumed"}
                </span>
              </div>

              {SELECT_FIELDS[key] ? (
                <select
                  value={field.value}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="w-full bg-transparent text-paper-100 font-mono text-sm focus:outline-none"
                >
                  {SELECT_FIELDS[key].map((opt) => (
                    <option key={opt} value={opt} className="bg-ink-800">
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={NUMERIC_FIELDS.has(key) ? "number" : "text"}
                  value={field.value}
                  min={NUMERIC_BOUNDS[key]?.min}
                  max={NUMERIC_BOUNDS[key]?.max}
                  step={NUMERIC_BOUNDS[key]?.step}
                  onChange={(e) =>
                    updateField(
                      key,
                      NUMERIC_FIELDS.has(key) ? Number(e.target.value) : e.target.value
                    )
                  }
                  className="w-full bg-transparent text-paper-100 font-mono text-sm focus:outline-none"
                />
              )}

              {NUMERIC_FIELDS.has(key) && NUMERIC_BOUNDS[key] && (
                <p className="text-paper-300/40 text-[11px] font-mono mt-1">
                  allowed range: {NUMERIC_BOUNDS[key].min} to {NUMERIC_BOUNDS[key].max}
                </p>
              )}

              {!confirmed && field.reason && (
                <p className="text-paper-300/60 text-xs mt-1.5 italic">{field.reason}</p>
              )}
              {!confirmed && (
                <button
                  onClick={() => acceptAssumption(key)}
                  className="text-teal-400 text-xs font-mono mt-2 hover:underline"
                >
                  accept this assumption
                </button>
              )}
            </div>
          );
        })}
      </div>

      {exp.missingFields?.length > 0 && (
        <p className="text-paper-300/60 text-xs font-mono mt-4">
          Not stated in the original question: {exp.missingFields.join(", ")}
        </p>
      )}

      <div className="flex gap-3 mt-7">
        <button
          onClick={onBack}
          className="text-paper-300 text-sm font-mono px-4 py-2.5 rounded-md border border-ink-600 hover:border-paper-300/50 transition-colors"
        >
          ← back
        </button>
        <button
          onClick={() => {
            // Belt-and-suspenders: re-clamp every numeric field right before
            // running the backtest, in case a value was left mid-edit.
            const clamped: Experiment = { ...exp };
            for (const key of Object.keys(NUMERIC_BOUNDS)) {
              (clamped as any)[key] = {
                ...(exp as any)[key],
                value: clamp(key, (exp as any)[key].value),
              };
            }
            onConfirm(clamped);
          }}
          className="bg-amber-400 text-ink-950 font-medium text-sm px-5 py-2.5 rounded-md hover:bg-amber-500 transition-colors"
        >
          Run experiment on simulated data
        </button>
      </div>
    </div>
  );
}
