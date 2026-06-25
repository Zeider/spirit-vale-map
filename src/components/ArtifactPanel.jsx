import { useStore } from '../state/store.jsx';
import { artifacts, artifactBySlug, gems, gemBySlug } from '../data/gear-index.js';
import { effectiveArtifacts, ARTIFACT_TYPES, sortStages } from '../logic/gear.js';
import Picker from './Picker.jsx';
import ItemTooltip from './ItemTooltip.jsx';

const TYPE_LABEL = { rune: 'Rune', jewel: 'Jewel', scroll: 'Scroll', relic: 'Relic' };

export default function ArtifactPanel() {
  const { state, dispatch } = useStore();
  const ro = state.readOnly;
  const stages = state.build.gearStages;
  if (!stages.length) return null;
  const sorted = sortStages(stages);
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const eff = effectiveArtifacts(sorted, idx);
  const op = state.openPicker;

  const counts = {};
  for (const v of Object.values(eff)) if (v?.set) counts[v.set] = (counts[v.set] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  const setOpts = artifacts.map((a) => {
    const stats = [...(a.perPiece || []), ...(a.fullSet || [])];
    return { key: a.slug, name: a.name, hint: (a.perPiece || []).join(' · '), search: `${a.name} ${stats.join(' ')}` };
  });
  const gemOpts = Object.values(gems).map((g) => ({ key: g.slug, name: g.name, hint: g.affix, search: `${g.name} ${g.affix} ${(g.stats || []).join(' ')}` }));

  return (
    <div className="artifact-panel">
      <h3>Artifacts</h3>
      <ul className="artifact-slots">
        {ARTIFACT_TYPES.map((t) => {
          const cur = eff[t];
          const set = cur?.set ? artifactBySlug[cur.set] : null;
          const gem = cur?.gem ? gemBySlug[cur.gem] : null;
          return (
            <li key={t} className="artifact-slot">
              <span className="atype">{TYPE_LABEL[t]}</span>
              <span className="tip-anchor aset-wrap">
                <button className={`aset${set ? '' : ' empty'}`} aria-label={`pick ${t} set`} disabled={ro} onClick={ro ? undefined : () => dispatch({ type: 'setPicker', picker: { kind: 'artifact', atype: t } })}>
                  {set ? set.name : '＋ pick set'}
                </button>
                {set && <span className="tip-host"><ItemTooltip item={set} /></span>}
              </span>
              {set && (
                <span className="tip-anchor agem-wrap">
                  <button className="agem" aria-label={`pick ${t} gem`} disabled={ro} onClick={ro ? undefined : () => dispatch({ type: 'setPicker', picker: { kind: 'gem', atype: t } })}>
                    {gem ? `💎 ${gem.name}` : '＋ gem'}
                  </button>
                  {gem && <span className="tip-host"><ItemTooltip item={gem} /></span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {top && <div className={`artifact-setbar${top[1] === 4 ? ' full' : ''}`}>✦ Full-set: {top[1]}/4 {artifactBySlug[top[0]]?.name}</div>}

      {op?.kind === 'artifact' && (
        <Picker title={`${TYPE_LABEL[op.atype]} set`} options={setOpts} value={eff[op.atype]?.set || null}
          onPick={(set) => { dispatch({ type: 'setArtifact', stageIndex: idx, atype: op.atype, set }); dispatch({ type: 'setPicker', picker: null }); }}
          onClose={() => dispatch({ type: 'setPicker', picker: null })} />
      )}
      {op?.kind === 'gem' && (
        <Picker title={`${TYPE_LABEL[op.atype]} gem`} options={gemOpts} value={eff[op.atype]?.gem || null}
          onPick={(gem) => { dispatch({ type: 'setArtifactGem', stageIndex: idx, atype: op.atype, gem }); dispatch({ type: 'setPicker', picker: null }); }}
          onClose={() => dispatch({ type: 'setPicker', picker: null })} />
      )}
    </div>
  );
}
