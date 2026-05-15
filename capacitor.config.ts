import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration.
 *
 * IMPORTANT — Two profiles:
 *   - DEV  (default): hot-reload from Lovable sandbox. Do NOT publish to stores in this mode.
 *   - PROD (store):   bundles `dist/` locally. Set CAPACITOR_PROD=1 before `npx cap sync`.
 *
 * Build per gli store:
 *   npm run build
 *   CAPACITOR_PROD=1 npx cap sync ios
 *   CAPACITOR_PROD=1 npx cap sync android
 */

const isProd = process.env.CAPACITOR_PROD === '1';

const config: CapacitorConfig = {
  appId: 'com.amg.horeca',
  appName: 'AMG HORECA',
  webDir: 'dist',
  bundledWebRuntime: false,

  // Solo in DEV: hot-reload dal sandbox Lovable.
  // In PROD viene rimosso così l'app carica i file locali (richiesto da App Store / Play).
  ...(isProd
    ? {}
    : {
        server: {
          url: 'https://171f463b-f5d2-43dc-8679-af4ba0d97645.lovableproject.com?forceHideBadge=true',
          cleartext: true,
        },
      }),

  ios: {
    contentInset: 'always',
    scheme: 'AMG HORECA',
    backgroundColor: '#0d0d0d',
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    backgroundColor: '#0d0d0d',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0d0d0d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d0d0d',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
