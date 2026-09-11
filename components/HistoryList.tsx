"use client";

export interface HistoryItem {
  id: string;
  question: string;
  savedAt: number;
  winRatePct: number;
  avgReturnPct: number;
}

export default function HistoryList({
  items,
  onSelect,
  onClear,
}: {
  items: HistoryItem[];
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-14 pt-6 rule">
      <div className="flex items-center justify-between mb-3">
        <span className="entry-index">PAST EXPERIMENTS (remembered on this device)</span>
        <button
          onClick={onClear}
          className="text-paper-300/50 text-xs font-mono hover:text-rust-400 transition-colors"
        >
          clear
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="w-full text-left border border-ink-600 rounded-md px-3.5 py-2.5 hover:border-teal-400/50 transition-colors"
          >
            <p className="text-paper-100 text-sm truncate">{item.question}</p>
            <p className="text-paper-300/50 text-xs font-mono mt-1">
              win rate {item.winRatePct.toFixed(0)}% · avg return{" "}
              {item.avgReturnPct >= 0 ? "+" : ""}
              {item.avgReturnPct.toFixed(2)}%
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
