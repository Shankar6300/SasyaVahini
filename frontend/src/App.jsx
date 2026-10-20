import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { PageSpinner } from './components/Spinner';

// Pages
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Role dashboards
import FarmerDashboard   from './pages/farmer/FarmerDashboard';
import FPODashboard      from './pages/fpo/FPODashboard';
import BuyerDashboard    from './pages/buyer/BuyerDashboard';
import LogisticsDashboard from './pages/logistics/LogisticsDashboard';
import AdminDashboard    from './pages/admin/AdminDashboard';

/**
 * Auto-redirect authenticated users from / to their role dashboard.
 */
function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <LandingPage />;
  const map = { FARMER: '/farmer', FPO: '/fpo', BUYER: '/buyer', LOGISTICS: '/logistics', ADMIN: '/admin' };
  return <Navigate to={map[user?.role] ?? '/'} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<HomeRedirect />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Farmer — Member 2 will add child routes */}
        <Route
          path="/farmer/*"
          element={
            <ProtectedRoute roles={['FARMER']}>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />

        {/* FPO — Member 2 */}
        <Route
          path="/fpo/*"
          element={
            <ProtectedRoute roles={['FPO']}>
              <FPODashboard />
            </ProtectedRoute>
          }
        />

        {/* Buyer — Member 3 */}
        <Route
          path="/buyer/*"
          element={
            <ProtectedRoute roles={['BUYER']}>
              <BuyerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Logistics — Member 4 */}
        <Route
          path="/logistics/*"
          element={
            <ProtectedRoute roles={['LOGISTICS']}>
              <LogisticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin — Members 1 (API) & 2 (UI) */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={
          <div className="empty-state" style={{ minHeight: '60vh' }}>
            <h1 className="heading-2">404 — Page not found</h1>
            <a href="/" className="btn btn-primary mt-4">Go Home</a>
          </div>
        } />
      </Routes>
    </>
  );
}
