export const CURRENT_STUDENT_ID = "S001";

export function formatSlot(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = match[2];
  return `${hour % 12 || 12}.${minute} ${hour >= 12 ? "pm" : "am"}`;
}
