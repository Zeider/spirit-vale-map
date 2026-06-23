import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { tileById } from '../data/map-tiles.js';
import { items as gearItems } from '../data/gear-index.js';
import { classifyLevel, computeGaps } from '../logic/levels.js';
import { stageRanges } from '../logic/gear.js';
import ItemTooltip from './ItemTooltip.jsx';
import RichNote from './RichNote.jsx';
import AddGearStage from './AddGearStage.jsx';
import Picker from './Picker.jsx';

export default function RouteRail() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(null);
  const [wantPicker, setWantPicker] = useState(null); // tile id whose WANT-HERE picker is open
  const entries = state.route.map((e) => ({ ...e, tile: tileById[e.id] })).filter((e) => e.tile);
  const stageRangeList = stageRanges(state.build.gearStages ?? []);
  const gaps = computeGaps(entries.map((e) => ({ minLevel: e.tile.minLevel, maxLevel: e.tile.maxLevel })));
  const min = entries.length ? Math.min(...entries.map((e) => e.tile.minLevel)) : null;
  const max = entries.length ? Math.max(...entries.map((e) => e.tile.maxLevel)) : null;

  return (
    <aside className="route-rail">
      <h2>Levelling route</h2>
      {entries.length === 0 ? (
        <p className="muted">No zones yet — click a zone and "Add to route".</p>
      ) : (
        <>
          <ol>
            {entries.map((e, i) => (
              <li key={e.id} className={`route-item lvl-${classifyLevel(e.tile.minLevel, e.tile.maxLevel, state.playerLevel)}`}>
                <div className="route-head">
                  <span className="route-pos">{i + 1}</span>
                  <button className="link" aria-label={`expand ${e.tile.name}`}
                    onClick={() => { setOpen(open === e.id ? null : e.id); dispatch({ type: 'select', id: e.id }); }}>
                    {e.tile.name} <span className="route-lvl">Lv {e.tile.minLevel}–{e.tile.maxLevel}</span>{e.wants.length ? <span className="want-count"> ·{e.wants.length}</span> : ''}
                  </button>
                  <span className="route-actions">
                    <button aria-label={`move ${e.tile.name} up`} disabled={i === 0} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: -1 })}>↑</button>
                    <button aria-label={`move ${e.tile.name} down`} disabled={i === entries.length - 1} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: 1 })}>↓</button>
                    <button aria-label={`remove ${e.tile.name}`} onClick={() => dispatch({ type: 'removeFromRoute', id: e.id })}>✕</button>
                  </span>
                </div>
                {open === e.id && (
                  <div className="route-expand">
                    <div className="label">WANT HERE</div>
                    <div className="wants">
                      {e.wants.map((w) => {
                        const it = gearItems[w];
                        return (
                          <span key={w} className="want-chip">
                            {it ? it.name : w}
                            <span className="tip-host"><ItemTooltip item={it} /></span>
                            <button aria-label={`remove want ${w}`} onClick={() => dispatch({ type: 'removeZoneWant', id: e.id, itemSlug: w })}>✕</button>
                          </span>
                        );
                      })}
                      {e.wants.length === 0 && <span className="muted">none yet</span>}
                      <button className="want-add" aria-label={`add want to ${e.tile.name}`}
                        onClick={() => setWantPicker(wantPicker === e.id ? null : e.id)}>＋</button>
                    </div>
                    {/* INTERIM: vendored drop/craft zone data is stale vs. the live game,
                        so the WANT-HERE picker offers ALL gear and the author curates.
                        When the game files are refreshed, revert to the zone-filtered
                        list: itemsForTile(e.id) from logic/gear.js. */}
                    {wantPicker === e.id && (
                      <Picker title={`Add item · ${e.tile.name}`} value={null}
                        options={Object.values(gearItems)
                          .filter((it) => !e.wants.includes(it.slug))
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((it) => ({ key: it.slug, name: it.name, hint: it.slot,
                            search: `${it.name} ${it.slot} ${(it.parsedStats || []).map((s) => s.label).join(' ')}` }))}
                        onPick={(slug) => { if (slug) dispatch({ type: 'addZoneWant', id: e.id, itemSlug: slug }); setWantPicker(null); }}
                        onClose={() => setWantPicker(null)} />
                    )}
                    <div className="label">NOTES</div>
                    <RichNote taClassName="zone-notes" value={e.notes} placeholder="e.g. farm to 40, grab 2 daggers"
                      onChange={(ev) => dispatch({ type: 'setZoneNotes', id: e.id, notes: ev.target.value })} />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="route-summary">
            <span>Covers Lv {min}–{max} · {entries.length} zones</span>
            {gaps.length > 0 && <span className="gaps">Gaps: {gaps.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join(', ')}</span>}
          </div>
        </>
      )}
      <div className="route-gear-stages">
        <div className="label">GEAR STAGES</div>
        {stageRangeList.length === 0 ? (
          <p className="muted">No gear stages yet.</p>
        ) : (
          <div className="stage-caps">
            {stageRangeList.map((r, i) => (
              <button key={i} className="stage-cap-chip" title="Edit this stage's gear"
                onClick={() => dispatch({ type: 'openGearEditor', index: i })}>Lv {r.start}–{r.toLevel}</button>
            ))}
          </div>
        )}
        <AddGearStage label="＋ Add gear stage" afterAdd={() => dispatch({ type: 'openGearEditor' })} />
      </div>
    </aside>
  );
}
