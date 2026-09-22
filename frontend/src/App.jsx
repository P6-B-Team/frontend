import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentPortal from './pages/StudentPortal';
import CustomerPortal from './pages/CustomerPortal';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const userRole = (localStorage.getItem('role') || '').toUpperCase().trim();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.includes(userRole)) {
    return children;
  }

  if (userRole === 'STUDENT' || userRole === 'TRAINEE') {
    return <Navigate to="/student" replace />;
  }
  
  if (['STOREKEEPER', 'STORE_SUPERVISOR', 'PROCUREMENT', 'PROCUREMENT_APPROVER', 'FINANCE_VIEWER', 'CUSTOMER', 'BUYER'].includes(userRole)) {
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[
              'WORKSHOP_MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 
              'QUALITY_CHECKER', 'TRAINING_SUPERVISOR', 'MENTOR', 'AUDITOR', 'ADMIN', 'MANAGER'
            ]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'TRAINEE']}>
              <StudentPortal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={[
              'STOREKEEPER', 'STORE_SUPERVISOR', 'PROCUREMENT', 
              'PROCUREMENT_APPROVER', 'FINANCE_VIEWER', 'CUSTOMER', 'BUYER'
            ]}>
              <CustomerPortal />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}