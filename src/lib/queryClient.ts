import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * QueryClient configured for offline-first behavior:
 * - long cache (24h) so re-opening the app shows data instantly
 * - retries disabled while offline
 * - data persisted to localStorage and rehydrated on next launch
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s: ricontrolla spesso, evita cache vuote persistenti
      gcTime: 1000 * 60 * 60 * 24, // 24h offline
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) return false;
        return failureCount < 2;
      },
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 0,
    },
  },
});

export const persister = typeof window !== "undefined"
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: "amg-horeca-cache-v1",
      throttleTime: 1000,
    })
  : undefined;
