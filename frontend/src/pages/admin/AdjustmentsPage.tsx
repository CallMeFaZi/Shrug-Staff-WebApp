import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adjustmentsApi, employeesApi } from '../../api/client';
import type { Adjustment, Employee } from '../../types';

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [adj, emp] = await Promise.all([
        adjustmentsApi.list(),
        employeesApi.list({ active: true }),
      ]);
      setAdjustments(Array.isArray(adj) ? adj : []);
      setEmployees(Array.isArray(emp) ? emp : []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const filtered = adjustments.filter(a => {
    if (filterEmp && a.employee_id !== parseInt(filterEmp)) return false;
    if (filterType && a.type !== filterType) return false;
    return true;
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this adjustment?')) return;
    try { await adjustmentsApi.delete(id); toast.success('Deleted'); loadData(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Adjustments</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ New</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Types</option>
          <option value="fine">Fines Only</option>
          <option value="bonus">Bonuses Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr><th className="table-header">Date</th><th className="table-header">Employee</th><th className="table-header">Type</th><th className="table-header">Amount</th><th className="table-header">Reason</th><th className="table-header"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-sm">{a.adjustment_date}</td>
                  <td className="table-cell text-sm">{a.employee_name || `ID:${a.employee_id}`}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${a.type === 'fine' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className={`table-cell text-sm font-medium ${a.type === 'fine' ? 'text-red-400' : 'text-green-400'}`}>
                    {a.type === 'fine' ? '-' : '+'}{a.amount} PKR
                  </td>
                  <td className="table-cell text-sm text-gray-400 max-w-xs truncate">{a.reason}</td>
                  <td className="table-cell">
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">No adjustments</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AdjustmentFormModal employees={employees} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function AdjustmentFormModal({ employees, onClose, onSaved }: { employees: Employee[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ employee_id: '', type: 'fine', amount: '', reason: '', adjustment_date: today });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) { toast.error('Select an employee'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.reason) { toast.error('Enter a reason'); return; }
    setSaving(true);
    try {
      await adjustmentsApi.create({
        employee_id: parseInt(form.employee_id),
        type: form.type,
        amount: parseFloat(form.amount),
        reason: form.reason,
        adjustment_date: form.adjustment_date,
      });
      toast.success(`${form.type === 'fine' ? 'Fine' : 'Bonus'} added`);
      onSaved();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">New Adjustment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Employee *</label>
            <select required value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className="input-field">
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({...form, type: 'fine'})} className={`px-4 py-2 rounded-lg text-sm font-medium flex-1 ${form.type === 'fine' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}>💰 Fine</button>
              <button type="button" onClick={() => setForm({...form, type: 'bonus'})} className={`px-4 py-2 rounded-lg text-sm font-medium flex-1 ${form.type === 'bonus' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>🎁 Bonus</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Amount (PKR) *</label>
            <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field" placeholder="e.g. 500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Reason *</label>
            <textarea required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="input-field" rows={2} placeholder="Why this fine/bonus?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
            <input type="date" value={form.adjustment_date} onChange={e => setForm({...form, adjustment_date: e.target.value})} className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}