import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  familyId: string;
  role: 'admin' | 'member';
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch extended profile with familyId
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (name: string, email: string, pass: string) => {
    // 1. Create Auth User
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, { displayName: name });

    // 2. Generate a new Family ID (Auto-ID from collection reference)
    const familyRef = doc(collection(db, 'families'));
    const familyId = familyRef.id;

    // 3. Create Family Document
    await setDoc(familyRef, {
      name: `Família de ${name}`,
      createdAt: new Date().toISOString(),
      accountSettings: [] // Empty initially, triggers Onboarding
    });

    // 4. Create User Profile linked to Family
    const profileData: UserProfile = {
      uid: user.uid,
      name,
      email,
      familyId,
      role: 'admin'
    };

    await setDoc(doc(db, 'users', user.uid), profileData);
    setUserProfile(profileData);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};