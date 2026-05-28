import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { dashboardApi } from '../../api/client';
import type { DashboardData } from '../../types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await dashboardApi.get();
      setData(res);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  const stats = [
    { label: 'Total Employees', value: data?.total_employees || 0, color: 'text-blue-400', icon: '👥' },
    { label: 'Present Today', value: data?.present_today || 0, color: 'text-green-400', icon: '✅' },
    { label: 'Absent Today', value: data?.absent_today || 0, color: 'text-red-400', icon: '❌' },
    { label: 'Late Today', value: data?.late_today || 0, color: 'text-yellow-400', icon: '⚠️' },
    { label: 'Incomplete', value: data?.incomplete_today || 0, color: 'text-gray-400', icon: '🔄' },
    { label: 'Payroll (Month)', value: `${(data?.payroll_total || 0).toLocaleString()} PKR`, color: 'text-purple-400', icon: '💰' },
  ];

  return (
    <div className="page-enter">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="stats-card">
            <p className="label">{s.icon} {s.label}</p>
            <p className={`value ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700/50">
          <h2 className="text-sm font-semibold text-white">Recent Attendance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="table-header">Employee</th>
                <th className="table-header">Date</th>
                <th className="table-header">In</th>
                <th className="table-header">Out</th>
                <th className="table-header">Status</th>
                <th className="table-header">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {data?.recent_attendance?.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-sm">{r.employee_name || `ID:${r.employee_id}`}</td>
                  <td className="table-cell text-sm">{r.attendance_date}</td>
                  <td className="table-cell text-sm">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : '-'}</td>
                  <td className="table-cell text-sm">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : '-'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'present' ? 'badge-present text-green-400' :
                      r.status === 'late' ? 'badge-late text-yellow-400' :
                      r.status === 'absent' ? 'badge-absent text-red-400' :
                      'badge-incomplete text-gray-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-gray-300">{r.payment} PKR</td>
                </tr>
              ))}
              {(!data?.recent_attendance?.length) && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">No records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}