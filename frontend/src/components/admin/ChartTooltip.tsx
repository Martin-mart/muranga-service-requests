import '../../styles/components/chart.css';

interface TooltipEntry {
  name?: string | number | undefined;
  value?: unknown;
  color?: string | undefined;
}

interface ChartTooltipProps {
  active?: boolean | undefined;
  label?: unknown;
  payload?: readonly TooltipEntry[] | undefined;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
}

/** Hover layer for every chart: label + one row per series, values in text ink. */
export function ChartTooltip({
  active,
  label,
  payload,
  formatValue = String,
  formatLabel = (l) => l,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{formatLabel(String(label))}</p>
      {payload.map((entry) => (
        <div key={String(entry.name)} className="chart-tooltip__row">
          <span className="chart-tooltip__name">
            <svg width="10" height="10" aria-hidden="true">
              <rect width="10" height="10" rx="2" fill={entry.color} />
            </svg>
            {entry.name}
          </span>
          <span className="chart-tooltip__value">
            {typeof entry.value === 'number' ? formatValue(entry.value) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
