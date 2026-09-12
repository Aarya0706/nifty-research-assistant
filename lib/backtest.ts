import { Experiment, BacktestSummary, BacktestTrade } from "./experimentSchema";
import { generateSyntheticSeries, DailyBar } from "./mockData";

/**
 * Deliberately simple, deterministic backtest:
 * - Walk the synthetic series day by day.
 * - When the entry rule fires (and the filter passes), "buy" at next day's close.
 * - Hold for holdingPeriodDays trading days, then "sell" at that close.
 * - Skip overlapping entries while already in a trade (no pyramiding) —
 *   keeps trade count honest and avoids overstating sample size.
 *
 * This is a stand-in for a real backtesting engine — the point of this
 * prototype is the research workflow (ask -> clarify -> define -> test ->
 * learn), not a production-grade quant backtester.
 */
export function runBacktest(experiment: Experiment): BacktestSummary {
  const tradingDays = Math.max(
    250,
    Math.round((experiment.testPeriodYears.value || 3) * 252)
  );
  const bars: DailyBar[] = generateSyntheticSeries(tradingDays, 42);

  const thresholdPct = experiment.entryThresholdPct.value; // e.g. -1 means "falls >= 1%"
  const holdDays = Math.max(1, Math.round(experiment.holdingPeriodDays.value || 5));
  const filter = experiment.filterType.value;
  const costFraction = (experiment.costAssumptionBps.value || 0) / 10000;

  // Median rolling vol, used to define "high" / "low" volatility relative to this series.
  const sortedVol = [...bars].map((b) => b.rollingVol).sort((a, b) => a - b);
  const medianVol = sortedVol[Math.floor(sortedVol.length / 2)] || 0;

  const trades: BacktestTrade[] = [];
  let inTrade = false;
  let cooldownUntil = -1;

  for (let i = 1; i < bars.length - holdDays; i++) {
    if (inTrade || i <= cooldownUntil) continue;

    const bar = bars[i];
    const fallCondition =
      thresholdPct < 0 ? bar.returnPct <= thresholdPct : bar.returnPct >= thresholdPct;

    if (!fallCondition) continue;

    if (filter === "high_volatility" && bar.rollingVol < medianVol) continue;
    if (filter === "low_volatility" && bar.rollingVol > medianVol) continue;

    const entryDay = i + 1;
    const exitDay = entryDay + holdDays;
    if (exitDay >= bars.length) continue;

    const entryPrice = bars[entryDay].close;
    const exitPrice = bars[exitDay].close;
    const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;

    trades.push({ entryDay, entryPrice, exitDay, exitPrice, returnPct });
    cooldownUntil = exitDay;
  }

  const numTrades = trades.length;
  const wins = trades.filter((t) => t.returnPct > 0).length;
  const avgReturnPct = numTrades
    ? trades.reduce((a, t) => a + t.returnPct, 0) / numTrades
    : 0;
  const avgReturnPctAfterCosts = avgReturnPct - costFraction * 100 * 2; // round-trip cost

  // Baseline: average return of holding the same period starting from a
  // random (unconditional) day — i.e. "what if you ignored the signal entirely".
  let baselineSum = 0;
  let baselineCount = 0;
  for (let i = 0; i < bars.length - holdDays; i += holdDays) {
    const entryPrice = bars[i].close;
    const exitPrice = bars[i + holdDays].close;
    baselineSum += ((exitPrice - entryPrice) / entryPrice) * 100;
    baselineCount++;
  }
  const baselineAvgReturnPct = baselineCount ? baselineSum / baselineCount : 0;

  const returns = trades.map((t) => t.returnPct);
  const bestReturnPct = returns.length ? Math.max(...returns) : 0;
  const worstReturnPct = returns.length ? Math.min(...returns) : 0;

  // Net-of-cost return on each individual trade, in trade order — this is
  // the series everything below (equity curve, drawdown, Sharpe) is built on,
  // since it's the return an investor would have actually captured.
  const roundTripCostPct = costFraction * 100 * 2;
  const netReturns = returns.map((r) => r - roundTripCostPct);

  // Equity curve: compound each trade's net return onto a running index
  // starting at 0% ("no strategy applied yet"). trades[i] realized => index
  // moves from equityCurvePct[i] to equityCurvePct[i+1].
  const equityCurvePct: number[] = [0];
  let equityMultiplier = 1;
  for (const r of netReturns) {
    equityMultiplier *= 1 + r / 100;
    equityCurvePct.push((equityMultiplier - 1) * 100);
  }

  // Max drawdown: largest peak-to-trough decline along that equity curve.
  let peak = equityCurvePct[0];
  let maxDrawdownPct = 0;
  for (const point of equityCurvePct) {
    if (point > peak) peak = point;
    // Drawdown measured against (1 + peak/100) so it's a proper percentage
    // decline in equity value, not just a difference in index points.
    const drawdown = ((1 + point / 100) - (1 + peak / 100)) / (1 + peak / 100) * 100;
    if (drawdown < maxDrawdownPct) maxDrawdownPct = drawdown;
  }

  // Simplified Sharpe-like ratio: mean / stdev of net per-trade returns.
  // Not annualized (that requires a fixed period length and a risk-free
  // rate) — deliberately labeled "simplified" wherever it's shown.
  let sharpeRatioSimplified = 0;
  if (netReturns.length > 1) {
    const mean = netReturns.reduce((a, b) => a + b, 0) / netReturns.length;
    const variance =
      netReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / netReturns.length;
    const stdev = Math.sqrt(variance);
    sharpeRatioSimplified = stdev > 0 ? mean / stdev : 0;
  }

  return {
    trades,
    numTrades,
    winRatePct: numTrades ? (wins / numTrades) * 100 : 0,
    avgReturnPct,
    avgReturnPctAfterCosts,
    baselineAvgReturnPct,
    bestReturnPct,
    worstReturnPct,
    equityCurvePct,
    maxDrawdownPct,
    sharpeRatioSimplified,
  };
}
