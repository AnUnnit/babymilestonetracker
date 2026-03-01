import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import BabySelector from './BabySelector';
import BabyTracker from './BabyTracker';
import SharedView from './SharedView';

export default function App() {
  const [session, setSession]       = useState(undefined);
  const [activeBaby, setActiveBaby] = useState(null);

  // ── Detect share route: /share/<token> ─────────────────────────────────────
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]{32})$/);
  if (shareMatch) {
    return <SharedView token={shareMatch[1]} />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setActiveBaby(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)',
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:52,marginBottom:16}}>👶</div>
        <div style={{color:'#6366f1',fontSize:14}}>Loading…</div>
      </div>
    </div>
  );

  if (!session) return <Auth />;

  if (!activeBaby) return (
    <BabySelector
      userId={session.user.id}
      userEmail={session.user.email}
      onSelectBaby={setActiveBaby}
      onLogout={() => supabase.auth.signOut()}
    />
  );

  return (
    <BabyTracker
      session={session}
      baby={activeBaby}
      onChangeBaby={() => setActiveBaby(null)}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}
