import { useState } from 'react';
import { sendFeedback } from '../state/feedback.js';

const TYPES = [['bug', '🐞 Bug'], ['idea', '💡 Idea'], ['other', '💬 Other']];

export default function FeedbackModal({ open, onClose }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('bug');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  if (!open) return null;
  const submit = async () => {
    if (!message.trim()) { setErr('Please enter a message.'); return; }
    setBusy(true); setErr('');
    try { await sendFeedback({ message, type }); setDone(true); }
    catch { setErr('Could not send — try again.'); } finally { setBusy(false); }
  };
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head"><h2>Send feedback</h2><button className="overlay-x" aria-label="close" onClick={onClose}>✕</button></div>
        {done ? (
          <p className="fb-thanks">Thanks! 🙏 Sent — with a link to exactly what you're looking at so it's easy to reproduce.</p>
        ) : (
          <>
            <div className="fb-types">
              {TYPES.map(([v, label]) => (
                <button key={v} className={`fb-type${type === v ? ' on' : ''}`} onClick={() => setType(v)}>{label}</button>
              ))}
            </div>
            <textarea aria-label="feedback message" className="fb-msg" rows="4"
              placeholder="What's working, broken, or missing?" value={message} onChange={(e) => setMessage(e.target.value)} />
            <p className="fb-note">We'll attach a link to your current view so we can reproduce it.</p>
            {err && <p className="fb-err">{err}</p>}
            <button className="fb-send" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send feedback'}</button>
          </>
        )}
      </div>
    </div>
  );
}
