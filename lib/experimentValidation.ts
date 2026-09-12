import { z } from "zod";

// The AI is told to return JSON matching our Experiment shape, but a system
// prompt is not a contract — the model can (and occasionally will) return
// malformed values, wrong types, or an out-of-range number. This schema is
// the actual enforcement point: if Gemini's output doesn't match this, we
// reject it here rather than silently trusting a `JSON.parse` result cast
// to a TypeScript type (which provides zero runtime safety on its own).

const fieldOf = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confirmed: z.boolean(),
    reason: z.string().optional(),
  });

export const ExperimentSchema = z.object({
  instrument: fieldOf(z.string().min(1).max(60)),
  timeframe: fieldOf(z.string().min(1).max(40)),
  entryDescription: fieldOf(z.string().min(1).max(300)),
  entryThresholdPct: fieldOf(z.number().finite().min(-50).max(50)),
  filterType: fieldOf(z.enum(["high_volatility", "low_volatility", "none", "other"])),
  filterDescription: fieldOf(z.string().max(300)),
  exitDescription: fieldOf(z.string().min(1).max(300)),
  holdingPeriodDays: fieldOf(z.number().finite().min(1).max(252)),
  testPeriodYears: fieldOf(z.number().finite().min(0.5).max(30)),
  costAssumptionBps: fieldOf(z.number().finite().min(0).max(500)),
  question: fieldOf(z.string().min(1).max(400)),
  missingFields: z.array(z.string()).max(20),
  clarifyingQuestions: z.array(z.string()).max(5),
});

export type ValidatedExperiment = z.infer<typeof ExperimentSchema>;

export const ExplanationSchema = z.object({
  whatDataShows: z.string().min(1).max(600),
  whatWeConclude: z.string().min(1).max(600),
  risksAndCaveats: z.array(z.string().min(1).max(200)).min(1).max(8),
  nextQuestions: z.array(z.string().min(1).max(200)).min(1).max(6),
});
