import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Pools from './pages/Pools';
import PoolDetail from './pages/PoolDetail';
import WaterQuality from './pages/WaterQuality';
import Maintenance from './pages/Maintenance';
import FrontDesk from './pages/FrontDesk';
import Patrols from './pages/Patrols';
import Complaints from './pages/Complaints';
import Compensations from './pages/Compensations';

function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pools" element={<Pools />} />
        <Route path="/pools/:id" element={<PoolDetail />} />
        <Route path="/water-quality" element={<WaterQuality />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/frontdesk" element={<FrontDesk />} />
        <Route path="/patrols" element={<Patrols />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/compensations" element={<Compensations />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
