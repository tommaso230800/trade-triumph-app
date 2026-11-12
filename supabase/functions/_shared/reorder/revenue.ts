/** Canonical order revenue (`ordini.totale`), shared by the app metrics and backend jobs. */
export const toNumber = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};
export const orderRevenue = (o: { totale?: unknown }): number => toNumber(o.totale);
