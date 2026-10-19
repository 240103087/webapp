import { useEffect, useState } from "react";

export function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** Ticks every second; announces to screen readers only when the minute changes. Calls onDone at zero. */
export function Countdown({ until, onDone }: { until: string; onDone: () => void }) {
  const target = Date.parse(until);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);
  const left = target - now;
  useEffect(() => {
    if (left <= 0) onDone();
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = parts(left);
  const cells: [number, string][] = [[p.days, "days"], [p.hours, "hours"], [p.minutes, "minutes"], [p.seconds, "seconds"]];
  return (
    <div className="countdown">
      <div className="countdown-cells" aria-hidden="true">
        {cells.map(([n, label]) => (
          <div key={label} className="cd-cell">
            <span className="cd-num mono">{String(n).padStart(2, "0")}</span>
            <span className="cd-label">{label}</span>
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{p.days} days, {p.hours} hours and {p.minutes} minutes left</p>
    </div>
  );
}
