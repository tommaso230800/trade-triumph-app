import jsPDF from "jspdf";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
const fmtNum = (n: number) => (n || 0).toLocaleString("it-IT");

export type KPIExportData = {
  periodoLabel: string;
  fatturatoTotale: number;
  ordiniTotali: number;
  cartoniTotali: number;
  pezziTotali: number;
  scontrinoMedio: number;
  scontoMedio: number;
  scontoCascataMedio: number;
  scontoMerceMedio: number;
  costoAcquistoTotale: number;
  utileLordo: number;
  marginePercentuale: number;
  trendPercentage: number;
  mom: number;
  yoy: number;
  yoyPrevFatturato: number;
  clientiKPI: Array<{
    nome: string;
    azienda: string | null;
    fatturato: number;
    fatturato_2025: number | null;
    ordini_count: number;
  }>;
  prodottiKPI: Array<{
    nome: string;
    azienda_nome: string;
    brand_nome: string | null;
    fatturato_totale: number;
    quantita_venduta: number;
  }>;
  aziendeKPI: Array<{
    nome: string;
    fatturato_totale: number;
    ordini_count: number;
  }>;
};

const csvEscape = (v: unknown) => {
  const s = String(v ?? "");
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export function exportKPIToCSV(d: KPIExportData) {
  const rows: string[] = [];
  rows.push(`KPI Export;${d.periodoLabel}`);
  rows.push("");
  rows.push("Sezione;Metrica;Valore");
  rows.push(`Riepilogo;Fatturato Totale;${d.fatturatoTotale.toFixed(2)}`);
  rows.push(`Riepilogo;Ordini;${d.ordiniTotali}`);
  rows.push(`Riepilogo;Cartoni;${d.cartoniTotali}`);
  rows.push(`Riepilogo;Pezzi;${d.pezziTotali}`);
  rows.push(`Riepilogo;Scontrino Medio;${d.scontrinoMedio.toFixed(2)}`);
  rows.push(`Riepilogo;Trend periodo precedente %;${d.trendPercentage.toFixed(2)}`);
  rows.push(`Confronto;MoM %;${d.mom.toFixed(2)}`);
  rows.push(`Confronto;YoY %;${d.yoy.toFixed(2)}`);
  rows.push(`Confronto;Fatturato anno precedente;${d.yoyPrevFatturato.toFixed(2)}`);
  rows.push(`Sconti;Sconto cascata medio %;${d.scontoCascataMedio.toFixed(2)}`);
  rows.push(`Sconti;Sconto globale medio %;${d.scontoMedio.toFixed(2)}`);
  rows.push(`Sconti;Sconto merce medio €/ordine;${d.scontoMerceMedio.toFixed(2)}`);
  rows.push(`Margine;Costo acquisto totale;${d.costoAcquistoTotale.toFixed(2)}`);
  rows.push(`Margine;Utile lordo;${d.utileLordo.toFixed(2)}`);
  rows.push(`Margine;Margine %;${d.marginePercentuale.toFixed(2)}`);
  rows.push("");
  rows.push("Top Clienti");
  rows.push("Cliente;Azienda;Ordini;Fatturato periodo;Fatturato 2025");
  d.clientiKPI.slice(0, 50).forEach((c) =>
    rows.push(
      [c.nome, c.azienda || "", c.ordini_count, c.fatturato.toFixed(2), (c.fatturato_2025 || 0).toFixed(2)]
        .map(csvEscape)
        .join(";")
    )
  );
  rows.push("");
  rows.push("Top Aziende");
  rows.push("Azienda;Ordini;Fatturato");
  d.aziendeKPI.slice(0, 50).forEach((a) =>
    rows.push([a.nome, a.ordini_count, a.fatturato_totale.toFixed(2)].map(csvEscape).join(";"))
  );
  rows.push("");
  rows.push("Top Prodotti");
  rows.push("Prodotto;Azienda;Brand;Pezzi;Fatturato");
  d.prodottiKPI.slice(0, 100).forEach((p) =>
    rows.push(
      [p.nome, p.azienda_nome, p.brand_nome || "", p.quantita_venduta, p.fatturato_totale.toFixed(2)]
        .map(csvEscape)
        .join(";")
    )
  );

  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpi_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportKPIToPDF(d: KPIExportData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Report KPI", margin, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Periodo: ${d.periodoLabel}`, margin, y);
  pdf.text(`Generato: ${new Date().toLocaleString("it-IT")}`, pageW - margin, y, { align: "right" });
  pdf.setTextColor(0);
  y += 8;

  // Riepilogo
  const summaryRows: [string, string][] = [
    ["Fatturato Totale", fmtEUR(d.fatturatoTotale)],
    ["Ordini", fmtNum(d.ordiniTotali)],
    ["Cartoni", fmtNum(d.cartoniTotali)],
    ["Pezzi", fmtNum(d.pezziTotali)],
    ["Scontrino Medio", fmtEUR(d.scontrinoMedio)],
    ["Trend periodo precedente", fmtPct(d.trendPercentage)],
  ];

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Riepilogo", margin, y);
  y += 5;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const colW = (pageW - margin * 2) / 2;
  summaryRows.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colW;
    const ry = y + row * 6;
    pdf.setTextColor(110);
    pdf.text(r[0], x, ry);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    pdf.text(r[1], x + colW - 2, ry, { align: "right" });
    pdf.setFont("helvetica", "normal");
  });
  y += Math.ceil(summaryRows.length / 2) * 6 + 4;

  // Confronti MoM / YoY
  ensureSpace(30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Confronti temporali", margin, y);
  y += 5;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const compRows: [string, string][] = [
    ["MoM (mese vs precedente)", fmtPct(d.mom)],
    ["YoY (vs stesso periodo a/p)", fmtPct(d.yoy)],
    ["Fatturato anno precedente", fmtEUR(d.yoyPrevFatturato)],
    ["Variazione vs anno prec.", fmtEUR(d.fatturatoTotale - d.yoyPrevFatturato)],
  ];
  compRows.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colW;
    const ry = y + row * 6;
    pdf.setTextColor(110);
    pdf.text(r[0], x, ry);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    pdf.text(r[1], x + colW - 2, ry, { align: "right" });
    pdf.setFont("helvetica", "normal");
  });
  y += Math.ceil(compRows.length / 2) * 6 + 4;

  // Margine
  ensureSpace(30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Margine reale", margin, y);
  y += 5;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const margRows: [string, string][] = [
    ["Costo acquisto totale", fmtEUR(d.costoAcquistoTotale)],
    ["Utile lordo", fmtEUR(d.utileLordo)],
    ["Margine %", fmtPct(d.marginePercentuale)],
    ["Sconto cascata medio", fmtPct(d.scontoCascataMedio)],
    ["Sconto globale medio", fmtPct(d.scontoMedio)],
    ["Sconto merce medio €/ord.", fmtEUR(d.scontoMerceMedio)],
  ];
  margRows.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colW;
    const ry = y + row * 6;
    pdf.setTextColor(110);
    pdf.text(r[0], x, ry);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    pdf.text(r[1], x + colW - 2, ry, { align: "right" });
    pdf.setFont("helvetica", "normal");
  });
  y += Math.ceil(margRows.length / 2) * 6 + 6;

  // Tabella semplice
  const drawTable = (title: string, headers: string[], rows: (string | number)[][], colWidths: number[]) => {
    ensureSpace(20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, margin, y);
    y += 5;
    pdf.setFontSize(9);
    // header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y, pageW - margin * 2, 6, "F");
    let x = margin + 1;
    headers.forEach((h, i) => {
      pdf.text(h, x, y + 4);
      x += colWidths[i];
    });
    y += 6;
    pdf.setFont("helvetica", "normal");
    rows.forEach((r) => {
      ensureSpace(5);
      let rx = margin + 1;
      r.forEach((cell, i) => {
        const txt = String(cell);
        const max = colWidths[i] - 2;
        const truncated = pdf.getTextWidth(txt) > max ? txt.substring(0, Math.floor(max / 1.5)) + "…" : txt;
        pdf.text(truncated, rx, y + 4);
        rx += colWidths[i];
      });
      y += 5;
    });
    y += 4;
  };

  drawTable(
    "Top 15 Clienti",
    ["Cliente", "Ordini", "Fatturato", "vs 2025"],
    d.clientiKPI.slice(0, 15).map((c) => [
      c.nome,
      String(c.ordini_count),
      fmtEUR(c.fatturato),
      fmtEUR(c.fatturato_2025 || 0),
    ]),
    [80, 20, 40, 40]
  );

  drawTable(
    "Top Aziende",
    ["Azienda", "Ordini", "Fatturato"],
    d.aziendeKPI.slice(0, 15).map((a) => [a.nome, a.ordini_count, fmtEUR(a.fatturato_totale)]),
    [110, 30, 40]
  );

  drawTable(
    "Top 20 Prodotti",
    ["Prodotto", "Azienda", "Pezzi", "Fatturato"],
    d.prodottiKPI.slice(0, 20).map((p) => [p.nome, p.azienda_nome, fmtNum(p.quantita_venduta), fmtEUR(p.fatturato_totale)]),
    [70, 50, 25, 35]
  );

  pdf.save(`kpi_${new Date().toISOString().slice(0, 10)}.pdf`);
}
