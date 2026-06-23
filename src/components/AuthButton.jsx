import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';

export default function AuthButton() {
  const { user, signInWithDiscord, signOut } = useAuth();
  const { dispatch } = useStore();
  const [open, setOpen] = useState(false);
  if (!user) return <button className="discord-btn" onClick={signInWithDiscord}>Sign in with Discord</button>;
  return (
    <span className="auth-menu">
      <button className="auth-avatar" onClick={() => setOpen((o) => !o)}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="av" />}{user.name} ▾
      </button>
      {open && (
        <div className="auth-pop" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { dispatch({ type: 'setView', view: 'my-builds' }); setOpen(false); }}>My Builds</button>
          <button onClick={() => { signOut(); setOpen(false); }}>Sign out</button>
        </div>
      )}
    </span>
  );
}
