import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { settingsApi } from '../../api/client';
import type { Setting } from '../../types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.get();
      const data = Array.isArray(res) ? res : [];
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach((s: Setting) => { values[s.key] = s.value; });
      setEditValues(values);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const items = Object.entries(editValues).map(([key, value]) => ({ key, value: String(value) }));
      await settingsApi.update(items);
      toast.success('Settings saved');
      loadSettings();
    } catch { toast.error('Failed to save'); }
  };

  const handleSeed = async () => {
    try { await settingsApi.seed(); toast.success('Defaults restored'); loadSettings(); }
    catch { toast.error('Failed'); }
  };

  const labels: Record<string, string> = {
    admin_pin: 'Admin PIN', grace_minutes: 'Grace Period (min)', late_deduction_interval: 'Deduction Interval (min)',
    late_deduction_amount: 'Late Deduction (PKR)', late_max_minutes: 'Max Late Before Absent (min)',
    working_days_per_month: 'Working Days / Month', daily_working_hours: 'Daily Hours',
    face_confidence_threshold: 'Face Confidence',
    geo_lat: '📍 Counter Latitude', geo_lng: '📍 Counter Longitude',
    geo_radius: '📍 Allowed Radius (meters)',
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
        <button onClick={handleSeed} className="btn-secondary text-xs py-1.5 px-3">Reset Defaults</button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 p-5 sm:p-6 max-w-2xl">
        <div className="space-y-5">
          {settings.map(s => (
            <div key={s.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1">{labels[s.key] || s.key}</label>
              <input type={s.key==='admin_pin'?'password':'text'} value={editValues[s.key]||''}
                onChange={e => setEditValues({...editValues, [s.key]: e.target.value})} className="input-field" />
            </div>
          ))}
        </div>
        <div className="mt-6 pt-5 border-t border-gray-700/50">
          <button onClick={handleSave} className="btn-primary text-sm">💾 Save</button>
        </div>
      </div>
    </div>
  );
}