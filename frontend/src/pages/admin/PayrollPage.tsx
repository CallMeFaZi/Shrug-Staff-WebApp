import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { payrollApi } from '../../api/client';
import type { Payroll } from '../../types';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollPage() {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  useEffect(() => { loadPayroll(); }, []);

  const loadPayroll = async () => {
    try { const res = await payrollApi.list(); setRecords(Array.isArray(res) ? res : []); }
    catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await payrollApi.generate(month, year);
      toast.success(`Generated for ${res.length} employees`);
      loadPayroll();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Payroll</h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field w-auto text-sm">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{monthNames[m-1]}</option>)}</select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field w-auto text-sm">{[today.getFullYear(), today.getFullYear()-1].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm whitespace-nowrap">{generating ? '⏳...' : '⚡ Generate'}</button>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr><th className="table-header">Employee</th><th className="table-header">Period</th><th className="table-header">Days</th><th className="table-header text-green-400">Present</th><th className="table-header text-yellow-400">Late</th><th className="table-header text-red-400">Absent</th><th className="table-header">Total</th><th className="table-header text-red-400">Deduct</th><th className="table-header text-green-400">Final</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {records.map(pr => (
                <tr key={pr.id} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-sm">{pr.full_name}</td>
                  <td className="table-cell text-sm">{monthNames[pr.month-1]} {pr.year}</td>
                  <td className="table-cell text-sm">{pr.total_days}</td>
                  <td className="table-cell text-sm text-green-400 font-medium">{pr.present_days}</td>
                  <td className="table-cell text-sm text-yellow-400">{pr.late_days}</td>
                  <td className="table-cell text-sm text-red-400">{pr.absent_days}</td>
                  <td className="table-cell text-sm">{pr.total_salary.toLocaleString()} PKR</td>
                  <td className="table-cell text-sm text-red-400">{pr.deductions.toLocaleString()} PKR</td>
                  <td className="table-cell text-sm font-bold text-green-400">{pr.final_salary.toLocaleString()} PKR</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-500 text-sm">Generate payroll first</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}