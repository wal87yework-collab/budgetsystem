import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  uid: string;
  username: string;
  role: 'admin' | 'store';
  storeId?: string;
  email: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const slugify = (text: string) => text.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserData);
          } else {
            const username = firebaseUser.email?.split('@')[0] || 'unknown';
            const role = username.toLowerCase() === 'admin' ? 'admin' : 'store';
            setUser({
              uid: firebaseUser.uid,
              username,
              role,
              email: firebaseUser.email || ''
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (username: string, password: string) => {
    const slug = slugify(username);
    const email = `${slug}@budgetsystem.local`;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error: Please disable ad blockers, Brave Shields, or check your internet connection.');
      }
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const role = username.toLowerCase() === 'admin' ? 'admin' : 'store';
          
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            username: username,
            role,
            email,
            storeId: role === 'store' ? username : null
          });
          
          await signInWithEmailAndPassword(auth, email, password);
        } catch (regError: any) {
          if (regError.code === 'auth/operation-not-allowed') {
            throw new Error('Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console.');
          }
          throw new Error(regError.message || 'Invalid credentials or failed to create account.');
        }
      } else {
        if (error.code === 'auth/operation-not-allowed') {
          throw new Error('Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console.');
        }
        throw error;
      }
    }
  };

  const logout = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
