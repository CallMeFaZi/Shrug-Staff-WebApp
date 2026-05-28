import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/employees', label: 'Employees', icon: '👥' },
  { path: '/admin/shifts', label: 'Shifts', icon: '🕐' },
  { path: '/admin/attendance', label: 'Attendance', icon: '📋' },
  { path: '/admin/payroll', label: 'Payroll', icon: '💰' },
  { path: '/admin/reports', label: 'Reports', icon: '📈' },
  { path: '/admin/logs', label: 'Logs', icon: '📝' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1e293b] border-r border-gray-700/50 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-gray-700/50">
            <h1 className="text-lg font-bold text-white">SHRUG STAFF</h1>
            <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-3 border-t border-gray-700/50 space-y-1">
            <button
              onClick={() => navigate('/')}
              className="sidebar-link w-full text-gray-400 hover:text-white"
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              onClick={handleLogout}
              className="sidebar-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="bg-[#1e293b]/80 backdrop-blur border-b border-gray-700/50 px-4 py-3 flex items-center justify-between lg:justify-end sticky top-0 z-10">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}