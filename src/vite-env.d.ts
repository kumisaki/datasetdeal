/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true", use Firebase cloud/emulator backend. Otherwise use built-in localStorage (default). */
  readonly VITE_USE_FIREBASE?: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_USE_EMULATORS?: string
  readonly VITE_FIREBASE_EMULATOR_HOST?: string
  readonly VITE_FIREBASE_AUTH_EMULATOR_PORT?: string
  readonly VITE_FIREBASE_FIRESTORE_EMULATOR_PORT?: string
  readonly VITE_FIREBASE_STORAGE_EMULATOR_PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
