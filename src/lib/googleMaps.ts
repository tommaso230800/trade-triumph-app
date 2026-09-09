/// <reference types="google.maps" />
/**
 * Caricamento una-tantum dell'SDK Google Maps (rendering GPU/WebGL lato tile,
 * clustering e heatmap gestiti da libreria) e stili cartografici del CRM.
 */

let mapsPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (mapsPromise) return mapsPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

  if (!key) {
    return Promise.reject(new Error("Chiave mappa non configurata"));
  }

  mapsPromise = new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if ((w.google as typeof google | undefined)?.maps?.Map) {
      resolve(w.google as typeof google);
      return;
    }
    const callbackName = "__crmInitGoogleMaps";
    w[callbackName] = () => resolve(w.google as typeof google);

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      callback: callbackName,
      libraries: "visualization,geometry",
      language: "it",
      region: "IT",
      v: "weekly",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error("Impossibile caricare la mappa"));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

/** Stile chiaro: neutro, pochissimi POI, strade morbide. */
export const STYLE_LIGHT: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f6f7f9" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5b6472" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d7dbe2" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#eef1f4" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e3ece2" }, { visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffe8c7" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#f0d6ad" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe3ef" }] },
];

/** Stile scuro: coerente con la modalità scura del CRM. */
export const STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#12161d" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b95a5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a3140" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#161b23" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16241c" }, { visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#20262f" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#31394a" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1622" }] },
];

export type MapStyleId = "standard" | "satellite" | "light" | "dark";

/** Colori marker per stato commerciale (allineati ai token del CRM). */
export const STATO_COLORI: Record<string, { fill: string; label: string }> = {
  attivo: { fill: "#0f9d58", label: "Attivo" },
  a_rischio: { fill: "#e8a317", label: "Da ricontattare" },
  inattivo: { fill: "#d93a2b", label: "Inattivo" },
  senza_ordini: { fill: "#6b7280", label: "Senza ordini" },
};

/** Icona marker proprietaria: goccia minimale con anello, generata come SVG. */
export function markerIcon(
  maps: typeof google.maps,
  color: string,
  size: number,
  selected: boolean,
): google.maps.Icon {
  const w = selected ? size * 1.35 : size;
  const h = w * 1.3;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 42">
  ${selected ? `<circle cx="16" cy="16" r="15" fill="${color}" opacity="0.18"/>` : ""}
  <path d="M16 41C16 41 29 25.5 29 16A13 13 0 1 0 3 16C3 25.5 16 41 16 41Z" fill="${color}"/>
  <path d="M16 41C16 41 29 25.5 29 16A13 13 0 1 0 3 16C3 25.5 16 41 16 41Z" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="${selected ? 2.4 : 1.6}"/>
  <circle cx="16" cy="16" r="5" fill="#ffffff" fill-opacity="0.95"/>
</svg>`.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(w, h),
    anchor: new maps.Point(w / 2, h),
  };
}
