// The structured shape an AI-parsed market question gets normalized into.
// Keeping this narrow and typed (instead of a free-form blob) is what lets
// the rest of the app — the clarify UI, the mock backtester, the results
// view — stay deterministic and simple, even though the *extraction* step
// is AI-driven.

export type FilterType = "high_volatility" | "low_volatility" | "none" | "other";

export interface FieldValue<T> {
  value: T;
  /** true = the user (or a sensible default) explicitly confirmed this;
   *  false = the model inferred/assumed it and it still needs confirmation. */
  confirmed: boolean;
  /** Why the model chose this value, shown to the user so assumptions are visible, not hidden. */
  reason?: string;
}

export interface Experiment {
  instrument: FieldValue<string>;
  timeframe: FieldValue<string>; // e.g. "Daily"
  entryDescription: FieldValue<string>; // human-readable entry rule
  entryThresholdPct: FieldValue<number>; // e.g. -1 for "falls 1%"
  filterType: FieldValue<FilterType>;
  filterDescription: FieldValue<string>;
  exitDescription: FieldValue<string>;
  holdingPeriodDays: FieldValue<number>;
  testPeriodYears: FieldValue<number>;
  costAssumptionBps: FieldValue<number>; // round-trip transaction cost, basis points
  question: FieldValue<string>; // what the user is actually trying to find out
  /** fields the model could not fill from the question at all */
  missingFields: string[];
  /** 1-3 questions worth asking the user directly before running anything */
  clarifyingQuestions: string[];
}

export const FIELD_LABELS: Record<keyof Omit<Experiment, "missingFields" | "clarifyingQuestions">, string> = {
  instrument: "Instrument",
  timeframe: "Timeframe",
  entryDescription: "Entry condition",
  entryThresholdPct: "Entry threshold (%)",
  filterType: "Filter",
  filterDescription: "Filter detail",
  exitDescription: "Exit condition",
  holdingPeriodDays: "Holding period (days)",
  testPeriodYears: "Test period (years)",
  costAssumptionBps: "Round-trip cost (bps)",
  question: "Research question",
};

export interface BacktestTrade {
  entryDay: number;
  entryPrice: number;
  exitDay: number;
  exitPrice: number;
  returnPct: number;
}

export interface BacktestSummary {
  trades: BacktestTrade[];
  numTrades: number;
  winRatePct: number;
  avgReturnPct: number;
  avgReturnPctAfterCosts: number;
  baselineAvgReturnPct: number;
  bestReturnPct: number;
  worstReturnPct: number;
  /** Cumulative return after each trade, compounded, net of costs. Starts at 0. */
  equityCurvePct: number[];
  maxDrawdownPct: number;
  /** Simplified, non-annualized Sharpe-like ratio: mean(net trade return) / stdev(net trade return).
   *  Not a textbook annualized Sharpe (that needs a risk-free rate and a fixed period length) —
   *  labeled "simplified" in the UI for exactly that reason. */
  sharpeRatioSimplified: number;
}
