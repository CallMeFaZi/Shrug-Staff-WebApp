import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { reportsApi } from '../../api/client';
import type { AttendanceTrend, PayrollTrend, EmployeeSummary } from '../../types';

export default function ReportsPage() {
  const [att, setAtt] = useState<AttendanceTrend[]>([]);
  const [pay, setPay] = useState<PayrollTrend[]>([]);
  const [emp, setEmp] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'attendance'|'payroll'|'employees'>('attendance');

  useEffect(() => {
    Promise.all([reportsApi.attendanceTrend(30), reportsApi.payrollTrend(6), reportsApi.employeeSummary()])
      .then(([a, p, e]) => { setAtt(a||[]); setPay(p||[]); setEmp(e||[]); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-5">Reports</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['attendance','payroll','employees'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${tab===t?'bg-blue-500 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {t==='attendance'?'📊 Attendance':t==='payroll'?'💰 Payroll':'👥 Employees'}
          </button>
        ))}
      </div>

      {tab==='attendance' && (
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50"><h2 className="text-sm font-semibold text-white">Last 30 Days</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead><tr><th className="table-header">Date</th><th className="table-header text-green-400">Present</th><th className="table-header text-yellow-400">Late</th><th className="table-header text-red-400">Absent</th></tr></thead>
              <tbody className="divide-y divide-gray-700/50">
                {att.map(d => <tr key={d.date} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-sm">{d.date}</td>
                  <td className="table-cell text-sm text-green-400">{d.present}</td>
                  <td className="table-cell text-sm text-yellow-400">{d.late}</td>
                  <td className="table-cell text-sm text-red-400">{d.absent}</td>
                </tr>)}
                {att.length===0 && <tr><td colSpan={4} className="text-center py-10 text-gray-500 text-sm">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='payroll' && (
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50"><h2 className="text-sm font-semibold text-white">Payroll Trend</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead><tr><th className="table-header">Period</th><th className="table-header">Employees</th><th className="table-header">Total</th><th className="table-header text-red-400">Deduct</th><th className="table-header text-green-400">Paid</th></tr></thead>
              <tbody className="divide-y divide-gray-700/50">
                {pay.map(p => <tr key={`${p.month}-${p.year}`} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-sm">{p.month}/{p.year}</td>
                  <td className="table-cell text-sm">{p.employee_count}</td>
                  <td className="table-cell text-sm">{p.total_salary.toLocaleString()} PKR</td>
                  <td className="table-cell text-sm text-red-400">{p.deductions.toLocaleString()} PKR</td>
                  <td className="table-cell text-sm text-green-400 font-medium">{p.final_salary.toLocaleString()} PKR</td>
                </tr>)}
                {pay.length===0 && <tr><td colSpan={5} className="text-center py-10 text-gray-500 text-sm">Generate payroll first</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='employees' && (
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50"><h2 className="text-sm font-semibold text-white">Employee Summary</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr><th className="table-header">Code</th><th className="table-header">Name</th><th className="table-header">Total</th><th className="table-header text-green-400">Present</th><th className="table-header text-yellow-400">Late</th><th className="table-header text-red-400">Absent</th><th className="table-header">Salary</th></tr></thead>
              <tbody className="divide-y divide-gray-700/50">
                {emp.map(e => <tr key={e.employee_id} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-xs text-gray-400">{e.employee_code}</td>
                  <td className="table-cell text-sm font-medium text-white">{e.full_name}</td>
                  <td className="table-cell text-sm">{e.total_attendance}</td>
                  <td className="table-cell text-sm text-green-400">{e.present}</td>
                  <td className="table-cell text-sm text-yellow-400">{e.late}</td>
                  <td className="table-cell text-sm text-red-400">{e.absent}</td>
                  <td className="table-cell text-sm">{e.monthly_salary.toLocaleString()} PKR</td>
                </tr>)}
                {emp.length===0 && <tr><td colSpan={7} className="text-center py-10 text-gray-500 text-sm">No employees</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}