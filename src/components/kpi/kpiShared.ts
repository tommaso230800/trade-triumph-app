// Intl.NumberFormat("it-IT") non raggruppa le migliaia sotto le 5 cifre
// (es. 1014 -> "1014"), quindi raggruppiamo a mano ovunque in questa pagina.
export const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Valori arrotondati all'euro, senza centesimi: coerente col mockup (nessun
// "€,00" in nessuna cifra) e più leggibile in una pagina densa di numeri.
export const formatCurrency = (value: number) => `${formatNumberIT(value)} €`;

export const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${formatNumberIT(value / 1000)}k €`;
  return formatCurrency(value);
};

export const mesiLabel = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
export const mesiLettera = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];
