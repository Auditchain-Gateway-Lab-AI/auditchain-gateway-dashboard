import React, { useEffect, useState } from 'react';
import api from '../../api';
import Icon from '../common/Icon';

const initial = { actor_field: '', fallback_actor_field: '', create_actor_field: '', update_actor_field: '', delete_actor_field: '' };

export default function ActorTrackingSettings() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/actor-config')
      .then(res => setForm({ ...initial, ...(res.data?.client || {}) }))
      .catch(err => setError(err.response?.data?.error || 'Gagal memuat konfigurasi actor.'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try { await api.patch('/dashboard/actor-config', form); setMessage('Konfigurasi actor berhasil disimpan.'); }
    catch (err) { setError(err.response?.data?.error || 'Gagal menyimpan konfigurasi actor.'); }
    finally { setSaving(false); }
  };

  return <section className="ac-profile-page">
    <div className="ac-profile-hero"><div className="ac-profile-hero__identity"><span className="ac-profile-hero__avatar"><Icon name="shield" size={22} /></span><div><span className="ac-page-kicker">Workspace Settings</span><h1>Actor Tracking</h1><p>Tentukan kolom evidence actor yang sudah disediakan oleh sistem client.</p></div></div></div>
    <form className="ac-profile-card ac-profile-form" onSubmit={submit}>
      <div className="ac-profile-card__header"><div><h2>Actor Field Mapping</h2><p>AuditChain hanya membaca field ini; tidak mengubah database client.</p></div><span className="ac-profile-card__icon ac-profile-card__icon--teal"><Icon name="settings" size={18} /></span></div>
      {loading ? <div className="ac-profile-loading"><Icon name="spinner" size={18} /> Loading...</div> : <>
        {error && <div className="ac-profile-alert ac-profile-alert--error">{error}</div>}{message && <div className="ac-profile-alert ac-profile-alert--success">{message}</div>}
        {[['create_actor_field','Insert actor','created_by'],['update_actor_field','Update actor','updated_by'],['delete_actor_field','Delete actor','deleted_by'],['actor_field','Generic actor (fallback utama)','actor'],['fallback_actor_field','Fallback actor','user_id']].map(([key,label,placeholder]) => <label className="ac-form-field" key={key}><span className="ac-form-label">{label}</span><input className="ac-form-input ac-form-input--lg" value={form[key] || ''} onChange={e => update(key, e.target.value)} placeholder={placeholder} /></label>)}
        <div className="ac-profile-actions"><button type="submit" className="ac-btn-primary" disabled={saving}><Icon name={saving ? 'spinner' : 'checkmark'} size={15} />{saving ? 'Saving...' : 'Save Mapping'}</button></div>
      </>}
    </form>
  </section>;
}
