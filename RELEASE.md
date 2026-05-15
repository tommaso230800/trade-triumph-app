# Pubblicazione AMG HORECA su App Store & Google Play

## 📋 Configurazione attuale

| Campo | Valore |
|---|---|
| **Bundle ID / App ID** | `com.amg.horeca` |
| **App Name** | AMG HORECA |
| **Versione** | 1.0.0 (build 1) |
| **Min iOS** | 13.0 |
| **Min Android** | API 23 (Android 6.0) |
| **Tema status bar** | Dark (#0d0d0d) |

⚠️ **Tutto va fatto sul tuo computer**, non da Lovable. Lovable contiene solo il codice sorgente; la firma e l'upload richiedono Xcode (Mac) e Android Studio.

---

## 🟢 Step 1 — Esporta e prepara il progetto

```bash
# 1. Su Lovable: pulsante in alto a destra "GitHub" → Export to GitHub
# 2. Clona sul tuo computer
git clone <tuo-repo>
cd <tuo-repo>
npm install

# 3. Aggiungi le piattaforme native (UNA SOLA VOLTA)
npx cap add ios
npx cap add android
```

---

## 🍎 Step 2 — Build iOS (richiede Mac + Xcode)

### A. Prerequisiti
- macOS con **Xcode 15+**
- Account **Apple Developer** ($99/anno) → https://developer.apple.com
- App registrata su **App Store Connect** con bundle ID `com.amg.horeca`

### B. Build & apertura in Xcode
```bash
npm run cap:ios
```
Questo: builda i file web, sincronizza con iOS e apre Xcode.

### C. In Xcode — configurazione signing
1. Seleziona il progetto **App** nella sidebar di sinistra
2. Tab **Signing & Capabilities**:
   - **Team**: seleziona il tuo team Apple Developer
   - **Bundle Identifier**: `com.amg.horeca` (già impostato)
   - **Automatically manage signing**: ✅ attivo (consigliato)
3. Tab **General** → **Identity**:
   - **Display Name**: AMG HORECA
   - **Version**: `1.0.0`
   - **Build**: `1` (incrementa ad ogni upload: 2, 3, …)

### D. Upload su App Store Connect
1. In Xcode menu **Product → Archive**
2. Apri **Window → Organizer**, seleziona l'archivio appena creato
3. Clicca **Distribute App → App Store Connect → Upload**
4. Vai su https://appstoreconnect.apple.com → la tua app → aggiungi screenshot, descrizione, prezzo → **Submit for Review**

⏱️ Review Apple: 24–48h tipicamente.

---

## 🤖 Step 3 — Build Android (richiede Android Studio)

### A. Prerequisiti
- **Android Studio** (qualsiasi OS) → https://developer.android.com/studio
- Account **Google Play Console** ($25 una tantum) → https://play.google.com/console

### B. Genera il keystore di firma (UNA SOLA VOLTA, da custodire!)
```bash
keytool -genkey -v -keystore amg-horeca-release.keystore \
  -alias amg-horeca -keyalg RSA -keysize 2048 -validity 10000
```
🔐 **Salva `amg-horeca-release.keystore` + password in un posto sicuro.** Se lo perdi non potrai più aggiornare l'app.

### C. Configura signing in Android Studio
1. Copia il keystore in `android/app/amg-horeca-release.keystore`
2. Crea `android/key.properties` (NON committarlo!):
   ```
   storePassword=LA_TUA_PASSWORD
   keyPassword=LA_TUA_PASSWORD
   keyAlias=amg-horeca
   storeFile=amg-horeca-release.keystore
   ```
3. Modifica `android/app/build.gradle`, aggiungi prima di `android {`:
   ```gradle
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```
   E dentro `android { ... }`:
   ```gradle
   signingConfigs {
       release {
           keyAlias keystoreProperties['keyAlias']
           keyPassword keystoreProperties['keyPassword']
           storeFile file(keystoreProperties['storeFile'])
           storePassword keystoreProperties['storePassword']
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
   }
   ```

### D. Imposta versione
Modifica `android/app/build.gradle` → blocco `defaultConfig`:
```gradle
versionCode 1        // incrementa ad ogni upload: 2, 3, …
versionName "1.0.0"  // versione visibile all'utente
```

### E. Build e upload
```bash
npm run cap:android
```
In Android Studio:
1. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**
2. Seleziona il keystore e firma
3. Output: `android/app/release/app-release.aab`
4. Carica il `.aab` su https://play.google.com/console → la tua app → **Production → Create new release**

⏱️ Review Google: poche ore – 2 giorni.

---

## 🔄 Aggiornamenti futuri

Dopo modifiche su Lovable:
```bash
git pull
npm install
npm run cap:sync           # sincronizza web → iOS + Android
```
Poi:
- **iOS**: incrementa **Build** in Xcode → Archive → Upload
- **Android**: incrementa **versionCode** in `build.gradle` → Generate Signed Bundle → Upload

---

## ⚙️ File chiave (già configurati per te)

- `capacitor.config.ts` — bundle id, splash, status bar, keyboard
- `package.json` — versione 1.0.0 + script `cap:ios` / `cap:android`
- `public/icon-512.png` — icona base (Android Studio / Xcode genereranno tutte le size)
- `public/manifest.json` — PWA web

---

## 🆘 Problemi comuni

| Errore | Soluzione |
|---|---|
| "No matching provisioning profile" (iOS) | Apple Developer account non collegato in Xcode → Preferences → Accounts |
| "Bundle ID already in use" | Cambia `appId` in `capacitor.config.ts` (es. `com.amg.horeca.app`) |
| App carica pagina bianca su device | Hai dimenticato `CAPACITOR_PROD=1` → usa `npm run cap:sync` |
| "Keystore was tampered with" | Password sbagliata in `key.properties` |
