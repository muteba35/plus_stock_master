export function expirationIsFuture(date, now = new Date()) {
  if (date == null) return true;
  if (!Number.isFinite(date.getTime())) return false;
  return date.toISOString().slice(0, 10) > now.toISOString().slice(0, 10);
}
