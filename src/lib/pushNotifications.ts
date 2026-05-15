/**
 * Push & Local Notifications wrapper.
 * - On native (Capacitor): real push registration + local notifications for testing.
 * - On web: falls back to the browser Notification API.
 */
import { Capacitor } from "@capacitor/core";

const isNative = () => Capacitor.isNativePlatform();

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export async function getNotificationPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const res = await PushNotifications.checkPermissions();
      return (res.receive as PermissionState) ?? "prompt";
    } catch {
      return "unsupported";
    }
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    const p = Notification.permission;
    if (p === "default") return "prompt";
    return p as PermissionState;
  }
  return "unsupported";
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const { LocalNotifications } = await import("@capacitor/local-notifications");

      const local = await LocalNotifications.requestPermissions();
      const push = await PushNotifications.requestPermissions();

      if (push.receive === "granted") {
        // Register with APNs / FCM. Token returned via listener.
        await PushNotifications.register();
        attachNativeListeners();
      }

      const result = (push.receive === "granted" || local.display === "granted")
        ? "granted"
        : (push.receive as PermissionState);
      return result;
    } catch (e) {
      console.error("[push] native permission error", e);
      return "unsupported";
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    const p = await Notification.requestPermission();
    return p as PermissionState;
  }
  return "unsupported";
}

let listenersAttached = false;
async function attachNativeListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    PushNotifications.addListener("registration", (token) => {
      console.log("[push] registration token:", token.value);
      try { localStorage.setItem("push_token", token.value); } catch {}
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error", err);
    });
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      console.log("[push] received", n);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      console.log("[push] action", a);
    });
  } catch (e) {
    console.error("[push] listener attach failed", e);
  }
}

/**
 * Sends a local test notification immediately. Works on native + web.
 */
export async function sendTestNotification(opts?: { title?: string; body?: string }) {
  const title = opts?.title ?? "AMG HORECA";
  const body = opts?.body ?? "Notifica di test ricevuta correttamente";

  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const r = await LocalNotifications.requestPermissions();
      if (r.display !== "granted") throw new Error("Permesso notifiche negato");
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 1000) },
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
    return;
  }

  if (!("Notification" in window)) throw new Error("Notifiche non supportate dal browser");
  if (Notification.permission !== "granted") {
    const p = await Notification.requestPermission();
    if (p !== "granted") throw new Error("Permesso notifiche negato");
  }
  new Notification(title, { body, icon: "/icon-192.png" });
}

export function isNativeApp() {
  return isNative();
}
