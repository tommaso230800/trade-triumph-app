/** Calendar date (YYYY-MM-DD) in Europe/Rome, shared by the app and backend jobs. */
export const todayRome = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(now);
