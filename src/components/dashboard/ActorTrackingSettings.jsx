import React, { useEffect, useState } from 'react';
import api from '../../api';
import Icon from '../common/Icon';

const initial = { actor_field: '', fallback_actor_field: '', create_actor_field: '', update_actor_field: '', delete_actor_field: '' };

const actionFields = [
  { key: 'create_actor_field', label: 'Insert actor', hint: 'Actor recorded when a row is created.', placeholder: 'created_by' },
  { key: 'update_actor_field', label: 'Update actor', hint: 'Actor recorded when a row is updated.', placeholder: 'updated_by' },
  { key: 'delete_actor_field', label: 'Delete actor', hint: 'Actor recorded when a row is deleted.', placeholder: 'deleted_by' },
];

const fallbackFields = [
  { key: 'actor_field', label: 'Generic actor', hint: 'Primary fallback for any action.', placeholder: 'actor' },
  { key: 'fallback_actor_field', label: 'Fallback actor', hint: 'Last fallback when no specific field is available.', placeholder: 'user_id' },
];

const allFields = [...actionFields, ...fallbackFields];

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

  const configuredCount = allFields.filter(field => String(form[field.key] || '').trim()).length;
  const completion = Math.round((configuredCount / allFields.length) * 100);
  const mappingStatus = loading ? 'Loading' : configuredCount === allFields.length ? 'Ready' : configuredCount > 0 ? 'Partial' : 'Not configured';

  const renderField = (field, index) => {
    const mapped = Boolean(String(form[field.key] || '').trim());
    return <label className="ac-actor-field" key={field.key}>
      <span className="ac-actor-field__topline">
        <span className="ac-actor-field__number">{String(index + 1).padStart(2, '0')}</span>
        <span className="ac-actor-field__label">{field.label}</span>
        <span className={`ac-actor-field__status${mapped ? ' ac-actor-field__status--mapped' : ''}`}>
          <Icon name={mapped ? 'checkCircle' : 'alertTriangle'} size={12} />
          {mapped ? 'Mapped' : 'Empty'}
        </span>
      </span>
      <span className="ac-actor-field__hint">{field.hint}</span>
      <input
        className="ac-form-input ac-form-input--lg"
        aria-label={field.label}
        value={form[field.key] || ''}
        onChange={event => update(field.key, event.target.value)}
        placeholder={field.placeholder}
      />
      <span className="ac-actor-field__example">Example: <code>{field.placeholder}</code></span>
    </label>;
  };

  return <section className="ac-actor-page">
    <header className="ac-actor-hero">
      <div className="ac-actor-hero__identity">
        <span className="ac-actor-hero__avatar"><Icon name="activity" size={25} /></span>
        <div>
          <span className="ac-page-kicker">Workspace Settings</span>
          <h1>Actor Tracking</h1>
          <p>Tentukan kolom evidence actor yang dipakai gateway saat mencatat audit log dari sistem client.</p>
          <div className="ac-actor-hero__badges">
            <span><Icon name="database" size={13} /> Read-only integration</span>
            <span><Icon name="checkCircle" size={13} /> Used by audit logs</span>
          </div>
        </div>
      </div>
      <div className="ac-actor-hero__status">
        <span>Mapping status</span>
        <strong>{mappingStatus}</strong>
        <small>{loading ? 'Reading workspace configuration...' : `${configuredCount} of ${allFields.length} fields mapped`}</small>
      </div>
    </header>

    <div className="ac-actor-workspace">
      <form className="ac-profile-card ac-actor-form" onSubmit={submit}>
        <div className="ac-actor-form__header">
          <div>
            <span className="ac-actor-section__eyebrow">CONFIGURATION</span>
            <h2>Actor field mapping</h2>
            <p>Hubungkan field actor dari client ke setiap aktivitas audit tanpa mengubah database sumber.</p>
          </div>
          <span className="ac-profile-card__icon ac-profile-card__icon--teal"><Icon name="settings" size={18} /></span>
        </div>

        {loading ? <div className="ac-profile-loading"><Icon name="spinner" size={18} /> Loading configuration...</div> : <>
          {error && <div className="ac-profile-alert ac-profile-alert--error"><Icon name="alertTriangle" size={15} /><span>{error}</span></div>}
          {message && <div className="ac-profile-alert ac-profile-alert--success"><Icon name="checkCircle" size={15} /><span>{message}</span></div>}

          <section className="ac-actor-section">
            <div className="ac-actor-section__header">
              <span className="ac-actor-section__icon ac-actor-section__icon--blue"><Icon name="activity" size={17} /></span>
              <div><h3>Action-specific fields</h3><p>Prioritaskan field ini agar actor untuk INSERT, UPDATE, dan DELETE tetap akurat.</p></div>
            </div>
            <div className="ac-actor-field-grid">{actionFields.map((field, index) => renderField(field, index))}</div>
          </section>

          <section className="ac-actor-section ac-actor-section--fallback">
            <div className="ac-actor-section__header">
              <span className="ac-actor-section__icon ac-actor-section__icon--teal"><Icon name="users" size={17} /></span>
              <div><h3>Fallback resolution</h3><p>Dipakai ketika field action-specific belum tersedia pada record client.</p></div>
            </div>
            <div className="ac-actor-field-grid ac-actor-field-grid--fallback">{fallbackFields.map((field, index) => renderField(field, index + actionFields.length))}</div>
          </section>

          <div className="ac-actor-form__footer">
            <p><Icon name="shield" size={14} /> Mapping hanya dibaca oleh gateway untuk membentuk evidence audit.</p>
            <button type="submit" className="ac-btn-primary" disabled={saving}>
              <Icon name={saving ? 'spinner' : 'checkmark'} size={15} />
              {saving ? 'Saving...' : 'Save mapping'}
            </button>
          </div>
        </>}
      </form>

      <aside className="ac-actor-aside">
        <section className="ac-profile-card ac-actor-info-card">
          <div className="ac-actor-info-card__header">
            <div><span className="ac-actor-section__eyebrow">HOW IT WORKS</span><h2>Actor resolution</h2><p>Gateway mencari actor dari yang paling spesifik ke fallback terakhir.</p></div>
            <span className="ac-profile-card__icon"><Icon name="list" size={18} /></span>
          </div>
          <ol className="ac-actor-resolution-list">
            <li><span>01</span><div><strong>Action-specific</strong><small>created_by, updated_by, atau deleted_by</small></div></li>
            <li><span>02</span><div><strong>Generic actor</strong><small>Field umum untuk semua jenis aktivitas</small></div></li>
            <li><span>03</span><div><strong>Fallback actor</strong><small>Dipakai jika actor utama tidak ditemukan</small></div></li>
          </ol>
        </section>

        <section className="ac-profile-card ac-actor-health-card">
          <div className="ac-actor-info-card__header">
            <div><span className="ac-actor-section__eyebrow">CONFIGURATION HEALTH</span><h2>Mapping coverage</h2></div>
            <strong className="ac-actor-health-card__score">{completion}%</strong>
          </div>
          <div className="ac-actor-progress" aria-label={`${completion}% of actor mappings configured`}><span style={{ width: `${completion}%` }} /></div>
          <p className="ac-actor-health-card__summary">{configuredCount === allFields.length ? 'All actor fields are ready for audit events.' : `${allFields.length - configuredCount} field${allFields.length - configuredCount === 1 ? '' : 's'} still need${allFields.length - configuredCount === 1 ? 's' : ''} a mapping.`}</p>
          <div className="ac-actor-health-list">
            {allFields.map(field => <div key={field.key}><span>{field.label}</span><code>{form[field.key] || 'Not mapped'}</code></div>)}
          </div>
        </section>
      </aside>
    </div>
  </section>;
}
