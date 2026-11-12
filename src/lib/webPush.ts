import { supabase } from "@/integrations/supabase/client";

/** Public VAPID key (safe to ship): identifies this app to the browser push services. */
export const VAPID_PUBLIC_KEY = "BFEShBsstGtNBUW6aEYrF7i3VlleiSShX9rrB4CSt7uOWwyQgEeXptIcxli0u_iURcgPKMjdxqGr_ZiEnbNyKv8";
const SW_URL = "/push-sw.js";

export type PushState =
  | "attive"
  | "da_attivare"
  | "da_concedere"
  | "bloccate"
  | "installazione_necessaria"
  | "apri_nuova_scheda"
  | "non_supportata";

export const PUSH_STATE_LABEL: Record<PushState, string> = {
  attive: "Notifiche attive",
  da_attivare: "Permesso concesso, da attivare",
  da_concedere: "Permesso da concedere",
  bloccate: "Notifiche bloccate nelle impostazioni del dispositivo",
  installazione_necessaria: "Installazione sulla schermata Home necessaria",
  apri_nuova_scheda: "Apri l’app in una scheda separata",
  non_supportata: "Funzione non supportata",
};

export const PUSH_STATE_HELP: Record<PushState, string> = {
  attive: "Questo dispositivo riceve gli avvisi anche ad app chiusa.",
  da_attivare: "Tocca il pulsante per collegare questo dispositivo.",
  da_concedere: "Tocca il pulsante e conferma la richiesta del dispositivo.",
  bloccate: "Riattivale da Impostazioni del dispositivo › Notifiche, poi riapri l’app.",
  installazione_necessaria: "Su iPhone e iPad: Condividi › Aggiungi alla schermata Home, poi apri l’app dall’icona.",
  apri_nuova_scheda: "Nell’anteprima la richiesta è bloccata: apri l’app pubblicata o in una nuova scheda.",
  non_supportata: "Questo browser non riceve notifiche push. La cronologia resta disponibile qui.",
};

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const inIframe = () => { try { return window.self !== window.top; } catch { return true; } };
const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg || !reg.active || !reg.active.scriptURL.endsWith(SW_URL)) return null;
  return reg.pushManager.getSubscription();
}

/** Pure decision used by the UI; inputs are read from the device. */
export function resolvePushState(input: {
  ios: boolean; standalone: boolean; supported: boolean; iframe: boolean;
  permission: NotificationPermission | null; subscribed: boolean;
}): PushState {
  if (input.ios && !input.standalone) return "installazione_necessaria";
  if (!input.supported) return "non_supportata";
  if (input.permission === "denied") return "bloccate";
  if (input.permission === "granted") return input.subscribed ? "attive" : "da_attivare";
  return input.iframe ? "apri_nuova_scheda" : "da_concedere";
}

export async function getPushState(): Promise<{ state: PushState; endpoint: string | null }> {
  const ok = supported();
  const sub = ok ? await currentSubscription().catch(() => null) : null;
  return {
    state: resolvePushState({ ios: isIOS(), standalone: isStandalone(), supported: ok, iframe: inIframe(), permission: ok ? Notification.permission : null, subscribed: !!sub }),
    endpoint: sub?.endpoint ?? null,
  };
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

export function deviceName(): string {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (isIOS() && !/iPhone/.test(ua)) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC Windows" : "Dispositivo";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${device} · ${isStandalone() ? "App" : browser}`;
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await supabase.rpc("register_push_device", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_nome: deviceName(),
    p_user_agent: navigator.userAgent.slice(0, 400),
    p_piattaforma: isStandalone() ? "pwa" : "browser",
  });
  if (error) throw new Error("Dispositivo non registrato. Riprova.");
}

/** Must be called directly from a tap: browsers ignore permission requests without a user gesture. */
export async function enablePushOnThisDevice(): Promise<PushState> {
  if (isIOS() && !isStandalone()) return "installazione_necessaria";
  if (!supported()) return "non_supportata";
  if (inIframe() && Notification.permission === "default") return "apri_nuova_scheda";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission === "denied") return "bloccate";
  if (permission !== "granted") return "da_concedere";
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }));
  await saveSubscription(sub);
  return "attive";
}

/** Keeps this device linked to whoever is signed in (silent, no permission prompt). */
export async function refreshDeviceRegistration(): Promise<void> {
  if (!supported() || Notification.permission !== "granted") return;
  const sub = await currentSubscription().catch(() => null);
  if (sub) await saveSubscription(sub).catch(() => undefined);
}

export async function disablePushOnThisDevice(deviceId?: string): Promise<void> {
  const sub = await currentSubscription().catch(() => null);
  if (sub) await sub.unsubscribe().catch(() => undefined);
  if (deviceId) await supabase.from("push_dispositivi").delete().eq("id", deviceId);
  else if (sub) await supabase.from("push_dispositivi").delete().eq("endpoint", sub.endpoint);
}

/** Asks the backend to deliver queued notifications now (the scheduled run is the backup). */
export function kickPushDispatch(delayMs = 1500): void {
  window.setTimeout(() => {
    supabase.functions.invoke("push-dispatch", { body: { action: "flush" } }).catch(() => undefined);
  }, delayMs);
}
