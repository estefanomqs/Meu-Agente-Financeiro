import React, { createContext, useContext, useEffect, useState } from 'react';

// Mock types to satisfy the app's expectations
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface UserProfile {
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

  // Load from LocalStorage on mount to persist login
  useEffect(() => {
    const storedUser = localStorage.getItem('zenith_mock_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setUserProfile({
        uid: user.uid,
        name: user.displayName || 'User',
        email: user.email || 'local@app.com',
        familyId: 'local-family',
        role: 'admin'
      });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    // Mock Login
    const mockUser: User = {
      uid: 'local-user-id',
      email: email,
      displayName: 'Usuário Local'
    };
    // Persist
    localStorage.setItem('zenith_mock_user', JSON.stringify(mockUser));

    setCurrentUser(mockUser);
    setUserProfile({
      uid: mockUser.uid,
      name: mockUser.displayName!,
      email: email,
      familyId: 'local-family',
      role: 'admin'
    });
  };

  const register = async (name: string, email: string, pass: string) => {
    // Mock Register - same as login but with custom name
    const mockUser: User = {
      uid: 'local-user-id',
      email: email,
      displayName: name
    };
    localStorage.setItem('zenith_mock_user', JSON.stringify(mockUser));

    setCurrentUser(mockUser);
    setUserProfile({
      uid: mockUser.uid,
      name: name,
      email: email,
      familyId: 'local-family',
      role: 'admin'
    });
  };

  const logout = async () => {
    localStorage.removeItem('zenith_mock_user');
    setCurrentUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};