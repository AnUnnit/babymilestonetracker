import { useState } from 'react';
import { supabase } from './supabaseClient';

const inp = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
  background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 15, outline: 'none',
  boxSizing: 'border-box',
};
const btn = (primary) => ({
  width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontSize: 15, fontWeight: 700, letterSpacing: '0.3px',
  background: primary ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.12)',
  color: primary ? 'white' : '#a5b4fc',
  marginTop: 8,
});

export default function Auth({ onGuestLogin, recoveryMode = false, onRecoveryDone }) {
  const [mode, setMode] = useState('login');      // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);   // {text, type: 'ok'|'err'}
  const [newPassword,  setNewPassword]  = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage({ text: error.message, type: 'err' });
    setLoading(false);
    // On success, App.js's onAuthStateChange fires → renders the tracker
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage({ text: error.message, type: 'err' });
    } else {
      setMessage({ text: 'Account created! Check your email to confirm, then log in.', type: 'ok' });
      setMode('login');
    }
    setLoading(false);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setMessage({ text: error.message, type: 'err' });
    } else {
      setMessage({ text: 'Password reset email sent! Check your inbox.', type: 'ok' });
    }
    setLoading(false);
  }

  async function handleSetNewPassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) return setMessage({ text: 'Password must be at least 6 characters.', type: 'err' });
    if (newPassword !== newPassword2) return setMessage({ text: 'Passwords do not match.', type: 'err' });
    setLoading(true); setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) return setMessage({ text: error.message, type: 'err' });
    setMessage({ text: 'Password updated! Please log in.', type: 'ok' });
    setTimeout(() => onRecoveryDone?.(), 1800);
  }

  const titles = { login: 'Welcome back', signup: 'Create account', forgot: 'Reset password' };
  const submit  = { login: handleLogin, signup: handleSignup, forgot: handleForgot };
  const btnText = { login: 'Log in', signup: 'Create account', forgot: 'Send reset email' };

  // ── Password recovery screen ────────────────────────────────────────────────
  if (recoveryMode) return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(30,27,75,0.7)', backdropFilter: 'blur(20px)',
        borderRadius: 20, padding: 36, border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🔐</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>Set new password</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Choose a new password for your account</div>
        </div>
        {message && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 9, fontSize: 13,
            background: message.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${message.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: message.type === 'ok' ? '#4ade80' : '#f87171' }}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSetNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input style={inp} type="password" placeholder="New password (min 6 chars)"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <input style={inp} type="password" placeholder="Confirm new password"
            value={newPassword2} onChange={e => setNewPassword2(e.target.value)} required />
          <button style={btn(true)} type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(30,27,75,0.7)', backdropFilter: 'blur(20px)',
        borderRadius: 20, border: '1px solid rgba(99,102,241,0.25)',
        padding: '36px 32px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>👶</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>
            Baby Tracker
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            {titles[mode]}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13,
            background: message.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${message.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: message.type === 'ok' ? '#4ade80' : '#f87171',
          }}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit[mode]}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
              Email address
            </label>
            <input
              style={inp} type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                Password
              </label>
              <input
                style={inp} type="password" required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          <button style={btn(true)} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : btnText[mode]}
          </button>
        </form>

        {/* Mode switchers */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          {mode === 'login' && <>
            <button style={btn(false)} onClick={() => { setMode('signup'); setMessage(null); }}>
              No account? Sign up
            </button>
            <button
              onClick={() => { setMode('forgot'); setMessage(null); }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', marginTop: 10 }}
            >
              Forgot password?
            </button>
          </>}

          {mode === 'signup' && (
            <button style={btn(false)} onClick={() => { setMode('login'); setMessage(null); }}>
              Already have an account? Log in
            </button>
          )}

          {mode === 'forgot' && (
            <button style={btn(false)} onClick={() => { setMode('login'); setMessage(null); }}>
              Back to login
            </button>
          )}
        </div>

        {/* Guest divider */}
        {mode !== 'forgot' && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.18)' }} />
              <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.18)' }} />
            </div>
            <button
              onClick={onGuestLogin}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.25)',
                background: 'rgba(99,102,241,0.07)', color: '#94a3b8',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.2px',
              }}
            >
              👀 Continue as Guest
            </button>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#475569', textAlign: 'center', lineHeight: 1.5 }}>
              No account needed · Data saved on this device only ·{' '}
              <span style={{ color: '#f87171' }}>Clears if browser storage is wiped</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
