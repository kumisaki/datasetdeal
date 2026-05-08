import { initializeApp, type FirebaseApp, getApps } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage'

import { isFirebaseBackend } from '@/lib/mode'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'placeholder',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'placeholder',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'placeholder',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'placeholder',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:placeholder',
}

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined

if (isFirebaseBackend()) {
  app = getApps()[0] ?? initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  if (useEmulators && typeof window !== 'undefined') {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1'
    const authPort = Number(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? 9099)
    const firestorePort = Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT ?? 8080)
    const storagePort = Number(import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT ?? 9199)
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, firestorePort)
    connectStorageEmulator(storage, host, storagePort)
  }
}

export { app, auth, db, storage }

export function requireDb(): Firestore {
  if (!db) throw new Error('Firebase is disabled. Set VITE_USE_FIREBASE=true in .env.local')
  return db
}

export function requireAuth(): Auth {
  if (!auth) throw new Error('Firebase is disabled. Set VITE_USE_FIREBASE=true in .env.local')
  return auth
}

export function requireStorage(): FirebaseStorage {
  if (!storage) throw new Error('Firebase is disabled. Set VITE_USE_FIREBASE=true in .env.local')
  return storage
}
