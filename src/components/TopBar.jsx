import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { saveShare } from '../state/shortlink.js';
import { gameVersion } from '../data/zones-index.js';
import FeedbackModal from './FeedbackModal.jsx';
import AuthButton from './AuthButton.jsx';
import PublishModal from './PublishModal.jsx';

const FILTERS = ['all', 'equip', 'material', 'card', 'gem', 'consumable', 'artifact'];

export default function TopBar() {
  const { state, dispatch } = useStore();
  const [copied, setCopied] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  // Save the full state (build + route + view) as a durable short link; fall back
  // to the long URL if Supabase is unreachable, then copy whichever we have.
  const share = async () => {
    const payload = { v: 1, build: state.build, route: state.route, view: state.view, lvl: state.playerLevel };
    let url = window.location.href;
    try {
      const id = await saveShare(payload);
      url = `${window.location.origin}${window.location.pathname}?s=${id}`;
    } catch { /* Supabase unreachable — keep the long URL */ }
    try { await navigator.clipboard.writeText(url); setCopied('✓ Copied!'); }
    catch { setCopied('Copy failed'); }
    setTimeout(() => setCopied(''), 1600);
  };
  const tab = (v, label) => (
    <button className={state.view === v ? 'on' : ''} onClick={() => dispatch({ type: 'setView', view: v })}>{label}</button>
  );
  return (
    <header className="top-bar">
      <span className="brand">⚔️ Spirit Vale Atlas</span>
      <nav className="view-toggle">
        {tab('atlas', '／Atlas')}{tab('build', 'Build')}{tab('gear', 'Gear')}
        <button className={state.view === 'builds' ? 'on' : ''} onClick={() => dispatch({ type: 'setGalleryBuild', id: null })}>Gallery</button>
      </nav>
      <span className="spacer" />
      {state.view === 'atlas' ? (
        <>
          <label className="field">Level
            <input type="number" min="1" max="135" value={state.playerLevel}
              onChange={(e) => dispatch({ type: 'setLevel', level: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
          </label>
          <label className="field">Filter
            <select value={state.dropFilter} onChange={(e) => dispatch({ type: 'setFilter', filter: e.target.value })}>
              {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <button onClick={share}>{copied || '🔗 Share route'}</button>
        </>
      ) : (
        <>
          <button onClick={share}>{copied || '🔗 Share build'}</button>
          <button onClick={() => setShowPublish(true)}>Publish</button>
          <button onClick={() => dispatch({ type: 'resetBuild' })}>Reset</button>
        </>
      )}
      <button className="feedback-btn" onClick={() => setShowFeedback(true)}>💬 Feedback</button>
      <AuthButton />
      <span className="game-version" title="Game data version">{gameVersion}</span>
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
      <PublishModal open={showPublish} onClose={() => setShowPublish(false)} />
    </header>
  );
}
