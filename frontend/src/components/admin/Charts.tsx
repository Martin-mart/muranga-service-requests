import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '../../hooks/useChartColors';
import type { Analytics } from '../../types/api';
import { formatDuration, formatNumber, formatShortDay } from '../../utils/format';
import { ChartTooltip } from './ChartTooltip';

type Breakdown = Analytics['byCategory'];

const AXIS_TICK_SIZE = 12;
const BAR_SIZE = 18; // <= 24px: bars never fill the band.

/** Open vs resolved per group, as horizontal stacked bars (long category names stay readable). */
export function OpenResolvedBars({ data }: { data: Breakdown }) {
  const colors = useChartColors();
  const tick = { fill: colors.axis, fontSize: AXIS_TICK_SIZE };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={colors.grid} strokeWidth={1} />
        <XAxis type="number" allowDecimals={false} tick={tick} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tick={tick}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.5 }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              payload={payload}
              label={label}
              formatValue={formatNumber}
            />
          )}
        />
        {/* Surface-coloured strokes produce the 2px gap between stacked segments. */}
        <Bar
          dataKey="resolved"
          name="Resolved"
          stackId="s"
          fill={colors.series[0]}
          stroke={colors.surface}
          strokeWidth={1}
          barSize={BAR_SIZE}
        />
        <Bar
          dataKey="open"
          name="Open"
          stackId="s"
          fill={colors.series[1]}
          stroke={colors.surface}
          strokeWidth={1}
          barSize={BAR_SIZE}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Requests created vs resolved per day: two 2px lines, crosshair tooltip. */
export function DailyTrend({ data }: { data: Analytics['daily'] }) {
  const colors = useChartColors();
  const tick = { fill: colors.axis, fontSize: AXIS_TICK_SIZE };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
        <XAxis
          dataKey="day"
          tickFormatter={formatShortDay}
          tick={tick}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          cursor={{ stroke: colors.axis, strokeWidth: 1 }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              payload={payload}
              label={label}
              formatLabel={formatShortDay}
              formatValue={formatNumber}
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="created"
          name="Submitted"
          stroke={colors.series[1]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke={colors.series[0]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Single series: average hours to resolve per category (no legend needed). */
export function ResolutionTimeBars({ data }: { data: Breakdown }) {
  const colors = useChartColors();
  const tick = { fill: colors.axis, fontSize: AXIS_TICK_SIZE };
  const rows = data.filter((row) => row.avgResolutionHours !== null);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={colors.grid} strokeWidth={1} />
        <XAxis type="number" tick={tick} axisLine={false} tickLine={false} unit=" h" />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tick={tick}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.5 }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              payload={payload}
              label={label}
              formatValue={formatDuration}
            />
          )}
        />
        <Bar
          dataKey="avgResolutionHours"
          name="Average time"
          fill={colors.series[0]}
          barSize={BAR_SIZE}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
