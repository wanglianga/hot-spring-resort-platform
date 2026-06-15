import { createContext, useContext, useState, useEffect } from 'react';
import { usersApi } from '../api';

const AuthContext = createContext();

const ROLE_NAMES = {
  frontdesk: '前厅',
  pool_attendant: '池区服务员',
  water_quality: '水质员',
  engineering: '工程班',
  housekeeper: '客房管家',
  customer_service: '客服',
  admin: '管理员'
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUsername = localStorage.getItem('currentUser');
    if (savedUsername) {
      login(savedUsername).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username) => {
    try {
      const res = await usersApi.get(username);
      setCurrentUser(res.data);
      localStorage.setItem('currentUser', username);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const getRoleName = (role) => ROLE_NAMES[role] || role;

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, getRoleName, ROLE_NAMES }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
