const TIME_ZONE = 'Africa/Nairobi';

const dateTime = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

const dateOnly = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeZone: TIME_ZONE });
const shortDay = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
export const formatDate = (iso: string): string => dateOnly.format(new Date(iso));
export const formatShortDay = (isoDay: string): string =>
  shortDay.format(new Date(`${isoDay}T12:00:00Z`));

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return 'just now';
}

/** 30.5 -> "1 day 6 h"; 3.25 -> "3.3 h"; null -> "No data". */
export function formatDuration(hours: number | null): string {
  if (hours === null) return 'No data';
  if (Math.round(hours * 10) < 240) return `${hours.toFixed(1)} h`;
  // Round before splitting, or 4 days 23.6 h would print as "4 days 24 h".
  const total = Math.round(hours);
  const days = Math.floor(total / 24);
  const rest = total % 24;
  return `${days} day${days === 1 ? '' : 's'}${rest > 0 ? ` ${rest} h` : ''}`;
}

export const formatNumber = (value: number): string => new Intl.NumberFormat('en-KE').format(value);

export function osmLink(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}
