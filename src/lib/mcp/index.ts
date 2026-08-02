import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientiTool from "./tools/list-clienti";
import getClienteTool from "./tools/get-cliente";
import listOrdiniTool from "./tools/list-ordini";
import getOrdineTool from "./tools/get-ordine";
import listAziendeTool from "./tools/list-aziende";
import listProdottiTool from "./tools/list-prodotti";
import listProvvigioniTool from "./tools/list-provvigioni";
import listCanvassPromoTool from "./tools/list-canvass-promo";
import createNotaTool from "./tools/create-nota";

// L'issuer OAuth deve puntare all'host Supabase diretto, costruito dal project ref
// (inlinato da Vite a build time, quindi nessuna lettura di env a runtime).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agente-plus",
  title: "Agente Plus",
  version: "0.1.0",
  instructions:
    "Strumenti del CRM AMG HO.RE.CA per agenti di commercio Food & Beverage. Permettono di consultare clienti, aziende mandanti, catalogo prodotti, ordini con le relative righe, canvass e promozioni, provvigioni e scadenziario, e di creare note commerciali. Tutti i dati sono filtrati sull'utente autenticato. Gli importi sono in euro.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listClientiTool,
    getClienteTool,
    listOrdiniTool,
    getOrdineTool,
    listAziendeTool,
    listProdottiTool,
    listProvvigioniTool,
    listCanvassPromoTool,
    createNotaTool,
  ],
});
