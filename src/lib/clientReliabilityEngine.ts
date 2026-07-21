// Motore di affidabilità cliente: score 0-100 basato su fatture, DSO, insoluti
export type FatturaLite = {
  data_scadenza: string | null;
  data_pagamento: string | null;
  importo: number | null;
  stato: string | null;
};

export type ReliabilityResult = {
  score: number;
  livello: "ottima" | "buona" | "media" | "bassa" | "critica";
  motivi: string[];
  fatture_scadute: number;
  importo_scaduto: number;
  dso_giorni: number | null;
};

export function computeReliability(fatture: FatturaLite[]): ReliabilityResult {
  const oggi = new Date();
  let score = 100;
  const motivi: string[] = [];

  const scadute = fatture.filter((f) => {
    if (!f.data_scadenza || f.data_pagamento) return false;
    return new Date(f.data_scadenza) < oggi;
  });
  const importoScaduto = scadute.reduce((s, f) => s + (f.importo ?? 0), 0);

  if (scadute.length > 0) {
    score -= Math.min(40, scadute.length * 8);
    motivi.push(`${scadute.length} fatture scadute (€${importoScaduto.toFixed(2)})`);
  }

  // DSO medio: giorni tra scadenza e pagamento
  const pagate = fatture.filter((f) => f.data_scadenza && f.data_pagamento);
  let dso: number | null = null;
  if (pagate.length) {
    const ritardi = pagate.map((f) => {
      const diff = (new Date(f.data_pagamento!).getTime() - new Date(f.data_scadenza!).getTime()) / (1000 * 60 * 60 * 24);
      return diff;
    });
    dso = Math.round(ritardi.reduce((s, r) => s + r, 0) / ritardi.length);
    if (dso > 30) { score -= 20; motivi.push(`DSO alto: ${dso} gg oltre scadenza`); }
    else if (dso > 15) { score -= 10; motivi.push(`Ritardo medio ${dso} gg`); }
    else if (dso > 0) { score -= 5; }
  }

  // Insoluti (marcati)
  const insoluti = fatture.filter((f) => (f.stato ?? "").toLowerCase().includes("insoluto"));
  if (insoluti.length) {
    score -= insoluti.length * 15;
    motivi.push(`${insoluti.length} insoluti`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const livello: ReliabilityResult["livello"] =
    score >= 85 ? "ottima" :
    score >= 70 ? "buona" :
    score >= 50 ? "media" :
    score >= 30 ? "bassa" : "critica";

  return {
    score,
    livello,
    motivi,
    fatture_scadute: scadute.length,
    importo_scaduto: importoScaduto,
    dso_giorni: dso,
  };
}
