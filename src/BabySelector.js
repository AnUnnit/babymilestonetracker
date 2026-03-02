import { useState, useEffect } from 'react';
import { fetchBabies, createBaby, deleteBaby } from './db';

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 16px',
  },
  card: {
    width: '100%', maxWidth: 440,
    background: 'rgba(30,27,75,0.75)', backdropFilter: 'blur(20px)',
    borderRadius: 20, border: '1px solid rgba(99,102,241,0.25)',
    padding: '28px 24px', marginBottom: 16,
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
  },
  inp: {
    width: '100%', padding: '11px 13px', borderRadius: 9,
    border: '1px solid rgba(99,102,241,0.3)',
    background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', marginTop: 4,
  },
  btn: (primary) => ({
    padding: primary ? '12px 22px' : '9px 18px',
    borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 14,
    background: primary ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.15)',
    color: primary ? 'white' : '#a5b4fc',
  }),
};

export default function BabySelector({ userId, userEmail, onSelectBaby, onLogout }) {
  const [babies, setBabies]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState(null);

  // New baby form state
  const [name, setName]             = useState('');
  const [dob, setDob]               = useState('');
  const [sex, setSex]               = useState('male');
  const [saving, setSaving]         = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setBabies(await fetchBabies(userId)); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name || !dob || !sex) return;
    setSaving(true); setError(null);
    try {
      const baby = await createBaby(userId, {
        name, dob, sex,
      });
      onSelectBaby(baby);
    } catch (e) { setError(e.message); setSaving(false); }
  }

  async function handleDelete(babyId, babyName) {
    if (!window.confirm(`Delete all data for ${babyName}? This cannot be undone.`)) return;
    try { await deleteBaby(babyId); await load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 28 }}>👶</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>Baby Tracker</h1>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{userEmail}</p>
        </div>
        <button style={S.btn(false)} onClick={onLogout}>Log out</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ width: '100%', maxWidth: 440, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Existing babies */}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading…</div>
      ) : babies.length === 0 && !showForm ? (
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 20px' }}>No babies added yet. Add your first baby to get started.</p>
          <button style={S.btn(true)} onClick={() => setShowForm(true)}>+ Add baby</button>
        </div>
      ) : (
        <>
          {babies.map(b => {
            const ageMs = Date.now() - new Date(b.dob).getTime();
            const ageDays = Math.floor(ageMs / 86400000);
            const ageWeeks = Math.floor(ageDays / 7);
            const ageMonths = Math.floor(ageDays / 30.4375);
            const ageLabel = ageMonths >= 2 ? `${ageMonths} months` : ageWeeks >= 1 ? `${ageWeeks} weeks` : `${ageDays} days`;
            return (
              <div key={b.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                onClick={() => onSelectBaby(b)}>
                <div style={{ fontSize: 36, flexShrink: 0 }}>{b.sex === 'female' ? '👧' : '👦'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{ageLabel} old · DOB {b.dob}</div>

                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button style={S.btn(true)} onClick={e => { e.stopPropagation(); onSelectBaby(b); }}>Open →</button>
                  <button style={{ ...S.btn(false), color: '#f87171', fontSize: 12 }}
                    onClick={e => { e.stopPropagation(); handleDelete(b.id, b.name); }}>Delete</button>
                </div>
              </div>
            );
          })}
          {!showForm && (
            <button style={{ ...S.btn(false), width: '100%', maxWidth: 440, padding: 14 }}
              onClick={() => setShowForm(true)}>+ Add another baby</button>
          )}
        </>
      )}

      {/* New baby form */}
      {showForm && (
        <div style={S.card}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Add baby</h2>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Baby's name *</label>
              <input style={S.inp} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Arjun" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Date of birth *</label>
                <input style={S.inp} type="date" value={dob} onChange={e => setDob(e.target.value)} required max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Sex *</label>
                <select style={S.inp} value={sex} onChange={e => setSex(e.target.value)}>
                  <option value="male">Boy</option>
                  <option value="female">Girl</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...S.btn(false), flex: 1 }} type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button style={{ ...S.btn(true), flex: 2 }} type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Add baby'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
