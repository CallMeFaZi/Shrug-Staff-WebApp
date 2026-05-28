import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { employeesApi, shiftsApi } from '../../api/client';
import type { Employee, Shift } from '../../types';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showFaceModal, setShowFaceModal] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [emps, shfs] = await Promise.all([employeesApi.list(), shiftsApi.list()]);
      setEmployees(emps); setShifts(shfs);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleSearch = async (term: string) => {
    setSearch(term);
    try { setEmployees(await employeesApi.list({ search: term || undefined })); }
    catch { toast.error('Search failed'); }
  };

  const handleDeactivate = async (id: number, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try { await employeesApi.deactivate(id); toast.success('Deactivated'); loadData(); }
    catch { toast.error('Failed'); }
  };

  const handleReactivate = async (id: number, name: string) => {
    try { await employeesApi.update(id, { active: true }); toast.success(`${name} reactivated`); loadData(); }
    catch { toast.error('Failed to reactivate'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Employees</h1>
        <button onClick={() => { setEditingEmployee(null); setShowModal(true); }} className="btn-primary text-sm">+ Add</button>
      </div>

      <input type="text" placeholder="Search by name or code..." value={search}
        onChange={e => handleSearch(e.target.value)} className="input-field max-w-md mb-5" />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setSearch('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!search.startsWith('show:')?'bg-blue-500 text-white':'bg-gray-700 text-gray-300'}`}>Active</button>
        <button onClick={() => setSearch('show:inactive')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${search==='show:inactive'?'bg-blue-500 text-white':'bg-gray-700 text-gray-300'}`}>Inactive</button>
        <button onClick={() => setSearch('show:all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${search==='show:all'?'bg-blue-500 text-white':'bg-gray-700 text-gray-300'}`}>All</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.filter(e => {
          if (search === 'show:inactive') return !e.active;
          if (search === 'show:all') return true;
          return e.active;
        }).map(emp => (
          <div key={emp.id} className={`bg-[#1e293b] rounded-2xl border p-5 ${emp.active ? 'border-gray-700/50' : 'border-red-900/30 opacity-70'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${emp.active ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
                <span className={`text-lg font-bold ${emp.active ? 'text-blue-400' : 'text-gray-400'}`}>{emp.full_name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-sm truncate">{emp.full_name}</h3>
                <p className="text-xs text-gray-500">ID: {emp.employee_code}</p>
                {!emp.active && <span className="text-xs text-red-400">⚠️ Deactivated</span>}
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-400">
              <p>📞 {emp.phone || 'N/A'}</p>
              <p>💰 {emp.monthly_salary.toLocaleString()} PKR/mo</p>
              <p>⏱ {emp.hourly_rate} PKR/hr</p>
            </div>
            <div className="mt-4 flex gap-2">
              {emp.active ? (
                <>
                  <button onClick={() => { setEditingEmployee(emp); setShowModal(true); }} className="btn-secondary text-xs py-1.5 px-3">Edit</button>
                  <button onClick={() => setShowFaceModal(emp.id)} className="btn-secondary text-xs py-1.5 px-3">📸 Face</button>
                  <button onClick={() => handleDeactivate(emp.id, emp.full_name)} className="text-xs text-red-400 py-1.5 px-3 hover:bg-red-500/10 rounded-lg">Deactivate</button>
                </>
              ) : (
                <button onClick={() => handleReactivate(emp.id, emp.full_name)} className="text-xs text-green-400 py-1.5 px-3 hover:bg-green-500/10 rounded-lg border border-green-500/30">✅ Reactivate</button>
              )}
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 text-sm">No employees found.</div>
        )}
      </div>

      {showModal && <EmployeeFormModal employee={editingEmployee} shifts={shifts} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadData(); }} />}
      {showFaceModal && <FaceRegistrationModal employeeId={showFaceModal} onClose={() => setShowFaceModal(null)} onUpload={async (id, file) => { await employeesApi.registerFace(id, file); toast.success('Face registered'); setShowFaceModal(null); }} />}
    </div>
  );
}

function EmployeeFormModal({ employee, shifts, onClose, onSaved }: { employee: Employee | null; shifts: Shift[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ employee_code: employee?.employee_code || '', full_name: employee?.full_name || '', phone: employee?.phone || '', monthly_salary: employee?.monthly_salary?.toString() || '', hourly_rate: employee?.hourly_rate?.toString() || '', shift_id: employee?.shift_id?.toString() || '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, monthly_salary: parseFloat(form.monthly_salary) || 0, hourly_rate: parseFloat(form.hourly_rate) || 0, shift_id: form.shift_id ? parseInt(form.shift_id) : null };
      if (employee) { await employeesApi.update(employee.id, payload); toast.success('Updated'); }
      else { await employeesApi.create(payload); toast.success('Created'); }
      onSaved();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-lg w-full border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Employee Code *</label><input type="text" required value={form.employee_code} onChange={e => setForm({...form, employee_code: e.target.value})} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label><input type="text" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Phone</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Monthly Salary (PKR)</label><input type="number" value={form.monthly_salary} onChange={e => setForm({...form, monthly_salary: e.target.value})} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Hourly Rate (PKR)</label><input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} className="input-field" placeholder="Auto if 0" /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">Shift</label><select value={form.shift_id} onChange={e => setForm({...form, shift_id: e.target.value})} className="input-field"><option value="">No shift</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : employee ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FaceRegistrationModal({ employeeId, onClose, onUpload }: { employeeId: number; onClose: () => void; onUpload: (id: number, file: File) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      setCamStream(stream);
      setCamReady(true);
    } catch { toast.error('Camera access denied'); }
  };

  useEffect(() => {
    if (camReady && videoRef.current && camStream) {
      videoRef.current.srcObject = camStream;
      videoRef.current.play().catch(() => {});
    }
  }, [camReady, camStream]);

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      setFile(new File([blob], `face_${employeeId}.jpg`, { type: 'image/jpeg' }));
      if (camStream) { camStream.getTracks().forEach(t => t.stop()); setCamStream(null); setCamReady(false); }
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => () => { if (camStream) camStream.getTracks().forEach(t => t.stop()); }, [camStream]);

  const handleSubmit = async () => { if (!file) return; setUploading(true); await onUpload(employeeId, file); setUploading(false); };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">Register Face</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setMode('upload'); if (camStream) camStream.getTracks().forEach(t => t.stop()); setCamStream(null); setCamReady(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'upload' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}>📁 Upload</button>
          <button onClick={() => { setMode('camera'); startCamera(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'camera' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}>📸 Live Camera</button>
        </div>
        {mode === 'upload' ? (
          <><p className="text-xs text-gray-400 mb-3">Upload a clear photo of the face</p><input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="input-field text-sm" /></>
        ) : (
          <div className="mb-4">
            <canvas ref={canvasRef} className="hidden" />
            <div className="bg-black rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3' }}>
              {camReady ? <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
                : <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '13px' }}>Starting camera...</div>}
            </div>
            {camReady && <button onClick={captureFromCamera} className="btn-primary w-full text-sm">📸 Capture</button>}
          </div>
        )}
        {file && !camReady && <div className="mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 text-center">✅ Photo ready</div>}
        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={!file || uploading} className="btn-primary flex-1 text-sm">{uploading ? 'Uploading...' : 'Save Face'}</button>
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}