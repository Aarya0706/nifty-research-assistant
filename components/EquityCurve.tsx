"use client";

// A small hand-rolled SVG line chart — deliberately not a charting library
// dependency, since this is one simple polyline styled to match the app's
// existing ink/teal/amber palette rather than a general-purpose chart.

export default function EquityCurve({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <p className="text-paper-300/50 text-sm font-mono">
        Not enough trades to plot an equity curve.
      </p>
    );
  }

  const width = 640;
  const height = 180;
  const paddingX = 8;
  const paddingY = 16;

  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;

  const toX = (i: number) =>
    paddingX + (i / (points.length - 1)) * (width - paddingX * 2);
  const toY = (v: number) =>
    height - paddingY - ((v - min) / range) * (height - paddingY * 2);

  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");

  const zeroY = toY(0);
  const finalValue = points[points.length - 1];
  const finalColor = finalValue >= 0 ? "#5AA69B" : "#C1694B";

  // Fill area under the curve down to the zero line, same color family as the line.
  const areaPath = `${path} L ${toX(points.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${toX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="none"
      role="img"
      aria-label="Cumulative strategy return across trades"
    >
      {/* zero baseline */}
      <line
        x1={paddingX}
        y1={zeroY}
        x2={width - paddingX}
        y2={zeroY}
        stroke="#2A4139"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <path d={areaPath} fill={finalColor} fillOpacity={0.08} stroke="none" />
      <path d={path} fill="none" stroke={finalColor} strokeWidth={1.75} />
    </svg>
  );
}
