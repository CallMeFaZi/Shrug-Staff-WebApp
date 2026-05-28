import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAttendanceApi } from '../../api/client';
import type { Attendance } from '../../types';

export default function AttendanceRecords() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const res = await adminAttendanceApi.list();
      setRecords(Array.isArray(res) ? res : []);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const filteredRecords = filter ? records.filter(r => r.status === filter) : records;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-5">Attendance Records</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'present', 'late', 'absent', 'incomplete'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr><th className="table-header">Employee</th><th className="table-header">Date</th><th className="table-header">In</th><th className="table-header">Out</th><th className="table-header">Hours</th><th className="table-header">Status</th><th className="table-header">Pay</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-sm font-medium text-white">{r.employee_name || `ID:${r.employee_id}`}</td>
                  <td className="table-cell text-sm">{r.attendance_date}</td>
                  <td className="table-cell text-sm">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : '-'}</td>
                  <td className="table-cell text-sm">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : '-'}</td>
                  <td className="table-cell text-sm">{r.total_hours}h</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'present' ? 'text-green-400 bg-green-500/10' :
                      r.status === 'late' ? 'text-yellow-400 bg-yellow-500/10' :
                      r.status === 'absent' ? 'text-red-400 bg-red-500/10' :
                      'text-gray-400 bg-gray-500/10'
                    }`}>{r.status}</span>
                  </td>
                  <td className="table-cell text-sm">{r.payment} PKR</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-500 text-sm">No records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}