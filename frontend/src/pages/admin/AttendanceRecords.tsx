import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAttendanceApi, employeesApi } from '../../api/client';
import type { Attendance, Employee } from '../../types';

function toLocalDatetimeString(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Convert UTC to local time for datetime-local input
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffset);
  return localDate.toISOString().slice(0, 16);
}

function localToUtcISOString(localString: string): string {
  // datetime-local format is YYYY-MM-DDTHH:MM (local time)
  // Parse as local time and return ISO string
  const [datePart, timePart] = localString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return date.toISOString();
}

export default function AttendanceRecords() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [addClockIn, setAddClockIn] = useState('');

  useEffect(() => { loadRecords(); loadEmployees(); }, []);

  const loadRecords = async () => {
    try {
      const res = await adminAttendanceApi.list();
      setRecords(Array.isArray(res) ? res : []);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeesApi.list({ active: true });
      setEmployees(Array.isArray(res) ? res : []);
    } catch { /* ignore */ }
  };

  const handleClockIn = async (employeeId: number) => {
    setActionLoading(prev => ({ ...prev, [employeeId]: true }));
    try {
      await adminAttendanceApi.clockIn(employeeId);
      toast.success('Employee clocked in');
      loadRecords();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to clock in');
    } finally {
      setActionLoading(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const handleClockOut = async (employeeId: number) => {
    setActionLoading(prev => ({ ...prev, [employeeId]: true }));
    try {
      await adminAttendanceApi.clockOut(employeeId);
      toast.success('Employee clocked out');
      loadRecords();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to clock out');
    } finally {
      setActionLoading(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const openEditModal = (record: Attendance) => {
    setEditingRecord(record);
    setEditClockIn(toLocalDatetimeString(record.clock_in));
    setEditClockOut(toLocalDatetimeString(record.clock_out));
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setEditClockIn('');
    setEditClockOut('');
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    setActionLoading(prev => ({ ...prev, [editingRecord.id]: true }));
    try {
      const updateData: { clock_in_time?: string; clock_out_time?: string } = {};
      if (editClockIn) updateData.clock_in_time = localToUtcISOString(editClockIn);
      if (editClockOut) updateData.clock_out_time = localToUtcISOString(editClockOut);
      await adminAttendanceApi.update(editingRecord.id, updateData);
      toast.success('Attendance updated');
      closeEditModal();
      loadRecords();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to update');
    } finally {
      setActionLoading(prev => ({ ...prev, [editingRecord.id]: false }));
    }
  };

  const handleAddRecord = async () => {
    if (!selectedEmployee || !addClockIn) {
      toast.error('Select employee and time');
      return;
    }
    setActionLoading(prev => ({ ...prev, ['add']: true }));
    try {
      await adminAttendanceApi.clockIn(selectedEmployee, localToUtcISOString(addClockIn));
      toast.success('Record added');
      setShowAddModal(false);
      setSelectedEmployee(null);
      setAddClockIn('');
      loadRecords();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to add record');
    } finally {
      setActionLoading(prev => ({ ...prev, ['add']: false }));
    }
  };

  const filteredRecords = filter ? records.filter(r => r.status === filter) : records;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Attendance Records</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-sm whitespace-nowrap"
        >
          + Add Record
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'present', 'late', 'absent', 'incomplete'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <th className="table-header">Employee</th>
                <th className="table-header">Date</th>
                <th className="table-header">In</th>
                <th className="table-header">Out</th>
                <th className="table-header">Hours</th>
                <th className="table-header">Status</th>
                <th className="table-header">Pay</th>
                <th className="table-header">Actions</th>
              </tr>
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
                  <td className="table-cell text-sm">
                    <div className="flex gap-1 items-center">
                      {!r.clock_in && (
                        <button
                          onClick={() => handleClockIn(r.employee_id)}
                          disabled={actionLoading[r.employee_id]}
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50 transition-colors"
                        >
                          Clock In
                        </button>
                      )}
                      {r.clock_in && !r.clock_out && (
                        <button
                          onClick={() => handleClockOut(r.employee_id)}
                          disabled={actionLoading[r.employee_id]}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                        >
                          Clock Out
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(r)}
                        disabled={actionLoading[r.id]}
                        className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 disabled:opacity-50 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-500 text-sm">No records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-xl p-6 w-96 max-w-full">
            <h3 className="text-lg font-bold text-white mb-4">Add Attendance Record</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Employee</label>
                <select
                  value={selectedEmployee || ''}
                  onChange={e => setSelectedEmployee(parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                >
                  <option value="">Select employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Clock In Time</label>
                <input
                  type="datetime-local"
                  value={addClockIn}
                  onChange={e => setAddClockIn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddRecord}
                  disabled={actionLoading['add']}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-xl p-6 w-96 max-w-full">
            <h3 className="text-lg font-bold text-white mb-4">Edit Attendance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Clock In</label>
                <input
                  type="datetime-local"
                  value={editClockIn}
                  onChange={e => setEditClockIn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Clock Out</label>
                <input
                  type="datetime-local"
                  value={editClockOut}
                  onChange={e => setEditClockOut(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleUpdate}
                  disabled={actionLoading[editingRecord.id]}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}