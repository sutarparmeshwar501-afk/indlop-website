import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    // Note: If permissions deny test/connection read for non-admins, it's expected, but online state is reached.
    return false;
  }
}

// Run connection check
testConnection().catch(console.error);

// Known Admin email
export const BOOTSTRAP_ADMIN_EMAIL = 'spgotya49@gmail.com';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt?: string;
}

export interface MessageSubmission {
  id?: string;
  name: string;
  email: string;
  message: string;
  type: 'contact' | 'support' | 'feedback';
  status: 'Open' | 'Pending' | 'Resolved';
  createdAt: any;
  updatedAt?: any;
  userId?: string;
}

export interface WaitlistSubmission {
  id?: string;
  name: string;
  email: string;
  handle?: string;
  message?: string;
  status: 'Open' | 'Pending' | 'Resolved';
  createdAt: any;
  updatedAt?: any;
  userId?: string;
}

// Check if user is an admin
export async function checkIsAdmin(user: FirebaseUser | null): Promise<boolean> {
  if (!user || !user.email) return false;
  if (user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    // Ensure admin document exists for spgotya49@gmail.com
    try {
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          email: user.email,
          role: 'superadmin',
          addedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Admin record check:', e);
    }
    return true;
  }

  try {
    const adminRef = doc(db, 'admins', user.uid);
    const snap = await getDoc(adminRef);
    return snap.exists();
  } catch (error) {
    return false;
  }
}

// Save or sync user profile
export async function syncUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { id: user.uid, ...(snap.data() as Omit<UserProfile, 'id'>) };
    } else {
      const isBootstrapAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const newProfile: Omit<UserProfile, 'id'> = {
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Member',
        role: 'user', // Security rules mandate 'user' on client creation
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, newProfile);

      if (isBootstrapAdmin) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: user.email,
            role: 'superadmin',
            addedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Seeding admin document failed:', err);
        }
      }

      return { id: user.uid, ...newProfile };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    throw error;
  }
}

// Submit contact / support message
export async function submitMessage(data: {
  name: string;
  email: string;
  message: string;
  type?: 'contact' | 'support' | 'feedback';
}): Promise<string> {
  const path = 'messages';
  try {
    const payload: Record<string, any> = {
      name: data.name.trim().slice(0, 100),
      email: data.email.trim().toLowerCase().slice(0, 254),
      message: data.message.trim().slice(0, 5000),
      type: data.type || 'contact',
      status: 'Open',
      createdAt: serverTimestamp()
    };
    if (auth.currentUser) {
      payload.userId = auth.currentUser.uid;
    }
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Submit waitlist entry
export async function submitWaitlist(data: {
  name: string;
  email: string;
  handle?: string;
  message?: string;
}): Promise<string> {
  const path = 'waitlist';
  try {
    const payload: Record<string, any> = {
      name: data.name.trim().slice(0, 100),
      email: data.email.trim().toLowerCase().slice(0, 254),
      status: 'Open',
      createdAt: serverTimestamp()
    };
    if (data.handle && data.handle.trim()) {
      payload.handle = data.handle.trim().slice(0, 50);
    }
    if (data.message && data.message.trim()) {
      payload.message = data.message.trim().slice(0, 1000);
    }
    if (auth.currentUser) {
      payload.userId = auth.currentUser.uid;
    }
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}
