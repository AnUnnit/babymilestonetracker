import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import BabySelector from './BabySelector';
import BabyTracker from './BabyTracker';
import SharedView from './SharedView';
import { getGuestId } from './guestDb';

export default function App() {
  const [session,     setSession]     = useState(undefined); // undefined = loading
  const [isGuest,     setIsGuest]     = useState(false);
  const [activeBaby,  setActiveBaby]  = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setActiveBaby(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Detect share route: /share/<token>
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]{32})$/);
  if (shareMatch) return <SharedView token={shareMatch[1]} />;

  // Loading spinner while Supabase session resolves
  if (session === undefined) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>👶</div>
        <div style={{ color: '#6366f1', fontSize: 14 }}>Loading…</div>
      </div>
    </div>
  );

  function handleGuestLogin() {
    getGuestId(); // ensures guest ID is created and persisted in localStorage
    setIsGuest(true);
  }

  function handleGuestLogout() {
    setIsGuest(false);
    setActiveBaby(null);
  }

  // Neither logged in nor guest → show Auth
  if (!session && !isGuest) return <Auth onGuestLogin={handleGuestLogin} />;

  // Guest or logged-in: no baby selected yet → BabySelector
  if (!activeBaby) return (
    <BabySelector
      userId={session ? session.user.id : getGuestId()}
      userEmail={session ? session.user.email : null}
      isGuest={isGuest}
      onSelectBaby={setActiveBaby}
      onLogout={isGuest ? handleGuestLogout : () => supabase.auth.signOut()}
    />
  );

  return (
    <BabyTracker
      session={session}
      isGuest={isGuest}
      baby={activeBaby}
      onChangeBaby={() => setActiveBaby(null)}
      onLogout={isGuest ? handleGuestLogout : () => supabase.auth.signOut()}
    />
  );
}
