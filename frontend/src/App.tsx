import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SplashPage from './pages/SplashPage';
import AttendancePage from './pages/AttendancePage';
import ConfirmPage from './pages/ConfirmPage';
import SuccessPage from './pages/SuccessPage';
import AdminLayout from './components/Layout/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import DashboardPage from './pages/admin/DashboardPage';
import EmployeesPage from './pages/admin/EmployeesPage';
import ShiftsPage from './pages/admin/ShiftsPage';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import PayrollPage from './pages/admin/PayrollPage';
import ReportsPage from './pages/admin/ReportsPage';
import LogsPage from './pages/admin/LogsPage';
import SettingsPage from './pages/admin/SettingsPage';

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<SplashPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/confirm/:id" element={<ConfirmPage />} />
        <Route path="/success" element={<SuccessPage />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="attendance" element={<AttendanceRecords />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;