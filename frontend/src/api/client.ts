import axios from 'axios';

// In dev (VITE_API_URL not set): API calls go to same host, Vite proxies /api to backend
// In production on Render: VITE_API_URL = backend URL (e.g. https://shrug-backend.onrender.com)
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add admin token to requests
// Reads from Zustand persisted state (key: 'shrug-auth')
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('shrug-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  return config;
});

// Handle auth errors - avoid redirect loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login (only if not already there)
      localStorage.removeItem('shrug-auth');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============== Admin Auth ==============
export const adminApi = {
  verifyPin: (pin: string) =>
    api.post('/admin/verify-pin', { pin }).then((r) => r.data),
};

// ============== Employees ==============
export const employeesApi = {
  list: (params?: { active?: boolean; search?: string }) =>
    api.get('/admin/employees', { params }).then((r) => r.data),
  get: (id: number) =>
    api.get(`/admin/employees/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post('/admin/employees', data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put(`/admin/employees/${id}`, data).then((r) => r.data),
  deactivate: (id: number) =>
    api.delete(`/admin/employees/${id}`).then((r) => r.data),
  registerFace: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post(`/admin/employees/${id}/face`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

// ============== Shifts ==============
export const shiftsApi = {
  list: () => api.get('/admin/shifts').then((r) => r.data),
  create: (data: any) => api.post('/admin/shifts', data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put(`/admin/shifts/${id}`, data).then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/admin/shifts/${id}`).then((r) => r.data),
};

// ============== Attendance ==============
export const attendanceApi = {
  clockIn: (employeeId: number) =>
    api.post('/clock-in', null, { params: { employee_id: employeeId } }).then((r) => r.data),
  clockOut: (employeeId: number) =>
    api.post('/clock-out', null, { params: { employee_id: employeeId } }).then((r) => r.data),
  getToday: (employeeId: number) =>
    api.get(`/employee/${employeeId}`).then((r) => r.data),
};

// ============== Recognition (Client-Side Descriptor) ==============
export const recognitionApi = {
  recognizeDescriptor: (descriptor: number[]) =>
    api.post('/recognize-descriptor', { descriptor }).then((r) => r.data),
  registerDescriptor: (employeeId: number, descriptor: number[]) =>
    api.post(`/admin/employees/${employeeId}/face-descriptor`, { descriptor }).then((r) => r.data),
};

// ============== Admin Dashboard ==============
export const dashboardApi = {
  get: () => api.get('/admin/dashboard').then((r) => r.data),
};

// ============== Admin Attendance ==============
export const adminAttendanceApi = {
  list: (params?: any) =>
    api.get('/admin/attendance', { params }).then((r) => r.data),
  getToday: () => api.get('/admin/attendance/today').then((r) => r.data),
};

// ============== Payroll ==============
export const payrollApi = {
  list: (params?: any) =>
    api.get('/admin/payroll', { params }).then((r) => r.data),
  generate: (month: number, year: number) =>
    api.post('/admin/payroll/generate', { month, year }).then((r) => r.data),
  summary: (params?: any) =>
    api.get('/admin/payroll/summary', { params }).then((r) => r.data),
};

// ============== Reports ==============
export const reportsApi = {
  attendanceTrend: (days?: number) =>
    api.get('/admin/reports/attendance-trend', { params: { days } }).then((r) => r.data),
  payrollTrend: (months?: number) =>
    api.get('/admin/reports/payroll-trend', { params: { months } }).then((r) => r.data),
  employeeSummary: () =>
    api.get('/admin/reports/employee-summary').then((r) => r.data),
};

// ============== Logs ==============
export const logsApi = {
  system: (params?: any) =>
    api.get('/admin/logs', { params }).then((r) => r.data),
  attendance: (params?: any) =>
    api.get('/admin/attendance-logs', { params }).then((r) => r.data),
};

// ============== Settings ==============
export const settingsApi = {
  get: () => api.get('/admin/settings').then((r) => r.data),
  update: (items: { key: string; value: string }[]) =>
    api.put('/admin/settings', { items }).then((r) => r.data),
  seed: () => api.post('/admin/settings/seed').then((r) => r.data),
};

// ============== Adjustments (Fines & Bonuses) ==============
export const adjustmentsApi = {
  list: (params?: any) =>
    api.get('/admin/adjustments', { params }).then((r) => r.data),
  create: (data: { employee_id: number; type: string; amount: number; reason: string; adjustment_date: string }) =>
    api.post('/admin/adjustments', data).then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/admin/adjustments/${id}`).then((r) => r.data),
};

export default api;