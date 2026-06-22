import { useRef, useLayoutEffect } from 'react';
import { useStore } from '../state/store.jsx';
import RichNote from './RichNote.jsx';
import { renderMarkdown } from '../logic/markdown.js';

export default function BuildNotes() {
  const { state, dispatch } = useStore();
  const ref = useRef(null);

  if (state.readOnly) {
    return (
      <div className="build-notes">
        <div className="label">BUILD NOTES</div>
        <div className="rich-preview" dangerouslySetInnerHTML={renderMarkdown(state.build.notes || '')} />
      </div>
    );
  }

  // Open tall: on mount, grow the textarea so its bottom aligns with the skill
  // trees' bottom (fills the otherwise-empty space). Sets an explicit pixel
  // height, so the native drag-resize handle still works afterward.
  useLayoutEffect(() => {
    const ta = ref.current;
    const trees = ta?.closest('.build-body')?.querySelector('.trees');
    if (!ta || !trees) return;
    const gap = trees.getBoundingClientRect().bottom - ta.getBoundingClientRect().bottom;
    if (gap > 0) ta.style.height = `${ta.offsetHeight + gap}px`;
  }, []);

  return (
    <div className="build-notes">
      <div className="label">BUILD NOTES</div>
      <RichNote grow={false} taRef={ref} taClassName="build-notes-area" value={state.build.notes}
        placeholder="Build order, alternative gear, strategy…"
        onChange={(e) => dispatch({ type: 'setBuildNotes', notes: e.target.value })} />
    </div>
  );
}
