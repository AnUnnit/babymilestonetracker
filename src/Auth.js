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

export default function Auth() {
  const [mode, setMode] = useState('login');      // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);   // {text, type: 'ok'|'err'}

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

  const titles = { login: 'Welcome back', signup: 'Create account', forgot: 'Reset password' };
  const submit  = { login: handleLogin, signup: handleSignup, forgot: handleForgot };
  const btnText = { login: 'Log in', signup: 'Create account', forgot: 'Send reset email' };

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
      </div>
    </div>
  );
}
