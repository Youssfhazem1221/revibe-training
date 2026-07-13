'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

const ADMIN_EMAIL = 'youssf.rehem@revibe.me';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result on page load
    getRedirectResult(auth).catch((error) => {
      console.error("Error handling redirect result:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Determine role from email first (always works, no network needed)
        let currentRole = 'trainee';
        if (firebaseUser.email && firebaseUser.email.toLowerCase() === ADMIN_EMAIL) {
          currentRole = 'trainer';
        }

        // Try to sync with Firestore, but don't block if it fails
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            if (firebaseUser.email.toLowerCase() === ADMIN_EMAIL && userDoc.data().role !== 'trainer') {
              await setDoc(userRef, { role: 'trainer', lastLogin: new Date().toISOString() }, { merge: true });
            } else {
              currentRole = userDoc.data().role || currentRole;
              await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
            }
          } else {
            await setDoc(userRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: currentRole,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn('Firestore sync failed, using email-based role:', error.message);
          // Role is already set from email check above, so the app still works
        }

        setUser(firebaseUser);
        setRole(currentRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, isTrainer: role === 'trainer', signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
