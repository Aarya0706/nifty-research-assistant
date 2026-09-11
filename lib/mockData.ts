// We don't have a live market data feed in this prototype, and the assignment
// explicitly allows simulated data ("You may use ... Simulated / mock data").
// This generates a reproducible synthetic daily-close series that *behaves*
// like an index: small daily drift, volatility clustering (calm stretches vs
// turbulent stretches), and occasional sharp single-day drops — so entry
// rules like "falls 1%+" and filters like "high volatility" actually have
// something realistic to bite into.
//
// This is clearly labeled as synthetic everywhere it's surfaced in the UI —
// it is a stand-in for a real data/backtesting engine, not a claim about
// actual NIFTY history.

export interface DailyBar {
  day: number; // trading-day index, 0-based
  close: number;
  returnPct: number; // close-over-close % change
  rollingVol: number; // 20-day rolling stdev of returns, %
}

// Mulberry32 seeded PRNG — deterministic so re-running an experiment
// with the same test period reproduces the same "market".
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  // Box-Muller
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function generateSyntheticSeries(tradingDays: number, seed = 42): DailyBar[] {
  const rand = mulberry32(seed);
  const bars: DailyBar[] = [];
  let price = 20000; // arbitrary starting index level
  let volRegime = 0.007; // ~0.7% daily vol baseline
  const returns: number[] = [];

  for (let day = 0; day < tradingDays; day++) {
    // Volatility regime drifts slowly and occasionally jumps into a "turbulent" spell.
    volRegime += (rand() - 0.5) * 0.0008;
    volRegime = Math.min(Math.max(volRegime, 0.004), 0.028);
    if (rand() < 0.01) volRegime = Math.min(volRegime * 2.2, 0.03); // shock into high-vol regime

    const drift = 0.00028; // slight long-run upward drift
    let ret = drift + gaussian(rand) * volRegime;

    // Fat-tailed sharp drops, more likely when already in a high-vol regime.
    const tailProb = volRegime > 0.015 ? 0.03 : 0.008;
    if (rand() < tailProb) {
      ret -= (0.01 + rand() * 0.025);
    }

    price = price * (1 + ret);
    returns.push(ret * 100);

    const windowStart = Math.max(0, returns.length - 20);
    const windowReturns = returns.slice(windowStart);
    const mean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
    const variance =
      windowReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / windowReturns.length;
    const rollingVol = Math.sqrt(variance);

    bars.push({ day, close: price, returnPct: ret * 100, rollingVol });
  }

  return bars;
}
