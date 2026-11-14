import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { ACTIVE_FIREBASE_CONFIG, USES_CUSTOM_DATABASE_ID } from '../config';

const app = initializeApp(ACTIVE_FIREBASE_CONFIG);

export const auth = getAuth(app);

// Trwała sesja w przeglądarce, aby kursant nie musiał logować się po każdym odświeżeniu
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Nie udało się ustawić browserLocalPersistence:', err);
});

export const db =
  USES_CUSTOM_DATABASE_ID && ACTIVE_FIREBASE_CONFIG.firestoreDatabaseId
    ? getFirestore(app, ACTIVE_FIREBASE_CONFIG.firestoreDatabaseId)
    : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'metadata'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Brak połączenia z Firebase Firestore. Sprawdź konfigurację.');
      return false;
    }
    return true;
  }
}
