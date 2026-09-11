"use client";

import { useEffect, useState } from "react";
import { Experiment, BacktestSummary } from "@/lib/experimentSchema";
import { runBacktest } from "@/lib/backtest";
import QuestionAsk from "@/components/QuestionAsk";
import ClarifyDefine from "@/components/ClarifyDefine";
import ResultsPanel, { Explanation } from "@/components/ResultsPanel";
import HistoryList, { HistoryItem } from "@/components/HistoryList";

type Step = "ask" | "clarify" | "results";

interface StoredRun {
  id: string;
  question: string;
  experiment: Experiment;
  summary: BacktestSummary;
  explanation: Explanation | null;
  savedAt: number;
}

const STORAGE_KEY = "ledger.history.v1";

export default function Home() {
  const [step, setStep] = useState<Step>("ask");
  const [question, setQuestion] = useState("");
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);

  const [loadingParse, setLoadingParse] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [history, setHistory] = useState<StoredRun[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function persistHistory(next: StoredRun[]) {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  }

  async function handleAsk(q: string) {
    setQuestion(q);
    setLoadingParse(true);
    setParseError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || "Something went wrong parsing the question.");
        return;
      }
      setExperiment(data as Experiment);
      setStep("clarify");
    } catch (e: any) {
      setParseError(e?.message || "Network error.");
    } finally {
      setLoadingParse(false);
    }
  }

  async function handleConfirm(exp: Experiment) {
    setExperiment(exp);
    const result = runBacktest(exp);
    setSummary(result);
    setStep("results");
    setExplanation(null);
    setLoadingExplain(true);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experiment: exp, summary: result }),
      });
      const data = await res.json();
      if (res.ok) {
        setExplanation(data as Explanation);
        const run: StoredRun = {
          id: crypto.randomUUID(),
          question,
          experiment: exp,
          summary: result,
          explanation: data as Explanation,
          savedAt: Date.now(),
        };
        persistHistory([run, ...history].slice(0, 20));
      }
    } catch {
      /* explanation is a nice-to-have; results still stand without it */
    } finally {
      setLoadingExplain(false);
    }
  }

  function reset() {
    setStep("ask");
    setQuestion("");
    setExperiment(null);
    setSummary(null);
    setExplanation(null);
    setParseError(null);
  }

  function selectHistory(id: string) {
    const run = history.find((h) => h.id === id);
    if (!run) return;
    setQuestion(run.question);
    setExperiment(run.experiment);
    setSummary(run.summary);
    setExplanation(run.explanation);
    setStep("results");
  }

  return (
    <main className="min-h-screen px-6 py-14 sm:py-20">
      <div className="max-w-notebook mx-auto">
        <p className="font-mono text-xs text-paper-300/50 tracking-wide mb-10">
          LEDGER · an AI trading research assistant (prototype)
        </p>

        {step === "ask" && (
          <QuestionAsk onSubmit={handleAsk} loading={loadingParse} error={parseError} />
        )}

        {step === "clarify" && experiment && (
          <ClarifyDefine
            question={question}
            experiment={experiment}
            onConfirm={handleConfirm}
            onBack={() => setStep("ask")}
          />
        )}

        {step === "results" && experiment && summary && (
          <ResultsPanel
            experiment={experiment}
            summary={summary}
            explanation={explanation}
            explanationLoading={loadingExplain}
            onNewExperiment={reset}
          />
        )}

        <HistoryList
          items={history.map((h) => ({
            id: h.id,
            question: h.question,
            savedAt: h.savedAt,
            winRatePct: h.summary.winRatePct,
            avgReturnPct: h.summary.avgReturnPct,
          }))}
          onSelect={selectHistory}
          onClear={() => persistHistory([])}
        />
      </div>
    </main>
  );
}
