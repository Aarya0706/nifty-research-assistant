"use client";

import { Experiment, BacktestSummary } from "@/lib/experimentSchema";
import EquityCurve from "./EquityCurve";

export interface Explanation {
  whatDataShows: string;
  whatWeConclude: string;
  risksAndCaveats: string[];
  nextQuestions: string[];
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-ink-600 rounded-md px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-paper-300/60 mb-1">
        {label}
      </div>
      <div className={`font-mono text-lg ${accent || "text-paper-100"}`}>{value}</div>
    </div>
  );
}

export default function ResultsPanel({
  experiment,
  summary,
  explanation,
  explanationLoading,
  onNewExperiment,
}: {
  experiment: Experiment;
  summary: BacktestSummary;
  explanation: Explanation | null;
  explanationLoading: boolean;
  onNewExperiment: () => void;
}) {
  const edgeVsBaseline = summary.avgReturnPct - summary.baselineAvgReturnPct;

  return (
    <div>
      <div className="entry-index mb-2">03 — TEST (simulated data)</div>
      <h2 className="font-serif text-2xl sm:text-3xl text-paper-100 mb-1">
        {summary.numTrades} matching setups found
      </h2>
      <p className="text-paper-300/80 text-sm mb-6 max-w-[62ch]">
        Run against a synthetic price series generated to resemble index behaviour
        (drift, volatility clustering, occasional sharp drops) — not real historical
        NIFTY data. Treat this as a demonstration of the workflow.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <Stat label="Trades triggered" value={String(summary.numTrades)} />
        <Stat label="Win rate" value={`${summary.winRatePct.toFixed(1)}%`} />
        <Stat
          label="Avg return / trade"
          value={`${summary.avgReturnPct >= 0 ? "+" : ""}${summary.avgReturnPct.toFixed(2)}%`}
          accent={summary.avgReturnPct >= 0 ? "text-teal-400" : "text-rust-400"}
        />
        <Stat
          label="Avg return after costs"
          value={`${summary.avgReturnPctAfterCosts >= 0 ? "+" : ""}${summary.avgReturnPctAfterCosts.toFixed(2)}%`}
        />
        <Stat
          label="vs. unconditional baseline"
          value={`${edgeVsBaseline >= 0 ? "+" : ""}${edgeVsBaseline.toFixed(2)}pp`}
          accent={edgeVsBaseline >= 0 ? "text-teal-400" : "text-rust-400"}
        />
        <Stat
          label="Best / worst trade"
          value={`${summary.bestReturnPct.toFixed(1)}% / ${summary.worstReturnPct.toFixed(1)}%`}
        />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-paper-300/60">
            Cumulative strategy return (net of costs)
          </span>
          <span
            className={`font-mono text-xs ${
              summary.equityCurvePct[summary.equityCurvePct.length - 1] >= 0
                ? "text-teal-400"
                : "text-rust-400"
            }`}
          >
            {summary.equityCurvePct[summary.equityCurvePct.length - 1] >= 0 ? "+" : ""}
            {summary.equityCurvePct[summary.equityCurvePct.length - 1].toFixed(1)}%
          </span>
        </div>
        <div className="border border-ink-600 rounded-md px-3 py-3 bg-ink-800/40">
          <EquityCurve points={summary.equityCurvePct} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Stat
            label="Max drawdown"
            value={`${summary.maxDrawdownPct.toFixed(1)}%`}
            accent="text-rust-400"
          />
          <Stat
            label="Risk-adj. return ratio*"
            value={summary.sharpeRatioSimplified.toFixed(2)}
          />
          <Stat label="Trades in curve" value={String(summary.numTrades)} />
        </div>
        <p className="text-paper-300/40 text-[11px] font-mono mt-2">
          *simplified: mean ÷ stdev of net per-trade returns — not an annualized Sharpe ratio.
        </p>
      </div>

      <div className="rule mb-8" />

      <div className="entry-index mb-3">04 — LEARN</div>

      {explanationLoading && (
        <p className="text-paper-300/60 text-sm font-mono">Writing up the explanation…</p>
      )}

      {explanation && (
        <div className="space-y-6">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wide text-teal-400 mb-1.5">
              What the data shows
            </h3>
            <p className="text-paper-100 text-[15px] leading-relaxed">
              {explanation.whatDataShows}
            </p>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wide text-amber-400 mb-1.5">
              What we can reasonably conclude
            </h3>
            <p className="text-paper-100 text-[15px] leading-relaxed">
              {explanation.whatWeConclude}
            </p>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wide text-rust-400 mb-1.5">
              What could make this misleading
            </h3>
            <ul className="space-y-1">
              {explanation.risksAndCaveats.map((r, i) => (
                <li key={i} className="text-paper-300 text-sm leading-relaxed">
                  · {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wide text-paper-300/70 mb-1.5">
              Worth investigating next
            </h3>
            <ul className="space-y-1">
              {explanation.nextQuestions.map((q, i) => (
                <li key={i} className="text-paper-300 text-sm leading-relaxed">
                  · {q}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <button
        onClick={onNewExperiment}
        className="mt-8 text-paper-300 text-sm font-mono px-4 py-2.5 rounded-md border border-ink-600 hover:border-paper-300/50 transition-colors"
      >
        ← start a new question
      </button>
    </div>
  );
}
