import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentPortal from './pages/StudentPortal';
import PartsRequisitionPage from './pages/PartsRequisitionPage';
import JobCardsPage from './pages/JobCardsPage';
import JobCardDetailPage from './pages/JobCardDetailPage';
import InventoryPage from './pages/InventoryPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import TrainingSupervisorPortal from './pages/TrainingSupervisorPortal';

// أدوار الوصول لكل مسار
const WORKSHOP_ROLES = [
  'WORKSHOP_MANAGER',
  'SERVICE_ADVISOR',
  'TECHNICIAN',
  'QUALITY_CHECKER',
  'ADMIN',
  'MANAGER',
];

const INVENTORY_ROLES = [
  'WORKSHOP_MANAGER',
  'STOREKEEPER',
  'STORE_SUPERVISOR',
  'ADMIN',
  'MANAGER',
];

const PROCUREMENT_ROLES = [
  'WORKSHOP_MANAGER',
  'PROCUREMENT',
  'PROCUREMENT_APPROVER',
  'STOREKEEPER',
  'STORE_SUPERVISOR',
  'ADMIN',
  'MANAGER',
];

const TRAINING_ROLES = [
  'TRAINING_SUPERVISOR',
  'MENTOR',
  'ADMIN',
  'MANAGER',
  'WORKSHOP_MANAGER',
];

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
  
  if (['TRAINING_SUPERVISOR', 'MENTOR'].includes(userRole)) {
    return <Navigate to="/training-supervisor" replace />;
  }

  if (['STOREKEEPER', 'STORE_SUPERVISOR', 'PROCUREMENT', 'PROCUREMENT_APPROVER', 'FINANCE_VIEWER', 'CUSTOMER', 'BUYER'].includes(userRole)) {
    return <Navigate to="/parts-requisition" replace />;
  }

  return <Navigate to="/" replace />;
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
              'QUALITY_CHECKER', 'AUDITOR', 'ADMIN', 'MANAGER'
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
          path="/parts-requisition"
          element={
            <ProtectedRoute allowedRoles={[
              'STOREKEEPER', 'STORE_SUPERVISOR', 'SERVICE_ADVISOR',
              'TECHNICIAN', 'WORKSHOP_MANAGER', 'PROCUREMENT',
              'PROCUREMENT_APPROVER', 'FINANCE_VIEWER', 'ADMIN', 'MANAGER',
              'CUSTOMER', 'BUYER'
            ]}>
              <PartsRequisitionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={
            <ProtectedRoute allowedRoles={WORKSHOP_ROLES}>
              <JobCardsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute allowedRoles={WORKSHOP_ROLES}>
              <JobCardDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={INVENTORY_ROLES}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute allowedRoles={PROCUREMENT_ROLES}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/training-supervisor"
          element={
            <ProtectedRoute allowedRoles={TRAINING_ROLES}>
              <TrainingSupervisorPortal />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}