import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { shiftsApi } from '../../api/client';
import type { Shift } from '../../types';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    try { setShifts(await shiftsApi.list()); }
    catch { toast.error('Failed to load shifts'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this shift?')) return;
    try { await shiftsApi.delete(id); toast.success('Deleted'); loadShifts(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Shifts</h1>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary text-sm">+ Add Shift</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shifts.map(s => (
          <div key={s.id} className="bg-[#1e293b] rounded-2xl border border-gray-700/50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <span className="text-lg">🕐</span>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{s.shift_name}</h3>
                <p className="text-xs text-gray-400">{s.start_time} - {s.end_time}</p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <p>⏱ Grace: {s.grace_minutes} min</p>
              <p>📊 Min hours: {s.minimum_hours}h</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setEditing(s); setShowModal(true); }} className="btn-secondary text-xs py-1.5 px-3">Edit</button>
              <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 py-1.5 px-3 hover:bg-red-500/10 rounded-lg">Delete</button>
            </div>
          </div>
        ))}
        {shifts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 text-sm">No shifts defined. Add your first shift!</div>
        )}
      </div>

      {showModal && <ShiftFormModal shift={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadShifts(); }} />}
    </div>
  );
}

function ShiftFormModal({ shift, onClose, onSaved }: { shift: Shift | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    shift_name: shift?.shift_name || '',
    start_time: shift?.start_time || '09:00',
    end_time: shift?.end_time || '18:00',
    grace_minutes: shift?.grace_minutes?.toString() || '15',
    minimum_hours: shift?.minimum_hours?.toString() || '9',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, grace_minutes: parseInt(form.grace_minutes), minimum_hours: parseFloat(form.minimum_hours) };
      if (shift) { await shiftsApi.update(shift.id, payload); toast.success('Updated'); }
      else { await shiftsApi.create(payload); toast.success('Created'); }
      onSaved();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">{shift ? 'Edit Shift' : 'Add Shift'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Shift Name *</label><input type="text" required value={form.shift_name} onChange={e => setForm({...form, shift_name: e.target.value})} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Start Time</label><input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="input-field" /></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">End Time</label><input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Grace Period (minutes)</label><input type="number" value={form.grace_minutes} onChange={e => setForm({...form, grace_minutes: e.target.value})} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Minimum Hours</label><input type="number" step="0.1" value={form.minimum_hours} onChange={e => setForm({...form, minimum_hours: e.target.value})} className="input-field" /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : shift ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}