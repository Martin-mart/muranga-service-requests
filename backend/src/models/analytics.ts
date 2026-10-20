export interface StatusTotals {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  open: number;
}

export interface BreakdownRow {
  id: string;
  name: string;
  total: number;
  open: number;
  resolved: number;
  avgResolutionHours: number | null;
}

export interface DailyPoint {
  day: string;
  created: number;
  resolved: number;
}

export interface Analytics {
  totals: StatusTotals;
  avgResolutionHours: number | null;
  byCategory: BreakdownRow[];
  bySubCounty: BreakdownRow[];
  daily: DailyPoint[];
}
