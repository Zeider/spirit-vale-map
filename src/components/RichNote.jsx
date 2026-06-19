import { useRef, useState, useLayoutEffect } from 'react';
import { renderMarkdown } from '../logic/markdown.js';

// A note field with a small markdown formatting toolbar + a Preview toggle.
// Renders an XSS-safe markdown subset (see logic/markdown.js). `grow` auto-sizes
// the textarea to its content; otherwise it stays user-resizable. `taRef` exposes
// the underlying textarea so hosts (e.g. BuildNotes) can keep custom sizing.
export default function RichNote({ value, onChange, placeholder, taClassName, grow = true, taRef, minHeight = 56 }) {
  const innerRef = useRef(null);
  const selRef = useRef({ start: 0, end: 0 });
  const [preview, setPreview] = useState(false);

  const setRef = (node) => {
    innerRef.current = node;
    if (typeof taRef === 'function') taRef(node);
    else if (taRef) taRef.current = node;
  };
  const remember = () => {
    const ta = innerRef.current;
    if (ta) selRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  };

  useLayoutEffect(() => {
    if (!grow || preview) return;
    const ta = innerRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(minHeight, ta.scrollHeight)}px`;
  }, [value, grow, minHeight, preview]);

  // Apply a transform around the last-known selection, then restore the caret.
  const apply = (fn) => {
    const v = String(value || '');
    const { start, end } = selRef.current;
    const next = fn(v, Math.min(start, v.length), Math.min(end, v.length));
    onChange({ target: { value: next.value } });
    requestAnimationFrame(() => {
      const ta = innerRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(next.selStart, next.selEnd); selRef.current = { start: next.selStart, end: next.selEnd }; }
    });
  };
  const wrap = (token) => apply((v, s, e) => {
    const sel = v.slice(s, e);
    return { value: v.slice(0, s) + token + sel + token + v.slice(e), selStart: s + token.length, selEnd: e + token.length };
  });
  const linePrefix = (prefix) => apply((v, s, e) => {
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const block = v.slice(lineStart, e);
    const prefixed = block.split('\n').map((l) => prefix + l).join('\n');
    return { value: v.slice(0, lineStart) + prefixed + v.slice(e), selStart: s + prefix.length, selEnd: e + (prefixed.length - block.length) };
  });
  const link = () => apply((v, s, e) => {
    const sel = v.slice(s, e) || 'text';
    const head = `[${sel}](`;
    return { value: `${v.slice(0, s)}[${sel}](https://)${v.slice(e)}`, selStart: s + head.length, selEnd: s + head.length + 'https://'.length };
  });
  const color = (hex) => apply((v, s, e) => {
    const sel = v.slice(s, e) || 'text';
    const head = `[color=${hex}]`;
    return { value: `${v.slice(0, s)}${head}${sel}[/color]${v.slice(e)}`, selStart: s + head.length, selEnd: s + head.length + sel.length };
  });

  const md = (e) => e.preventDefault(); // keep textarea focus/selection on button press

  return (
    <div className="rich-note">
      <div className="rich-toolbar">
        {!preview && (
          <>
            <button type="button" title="Bold" aria-label="bold" onMouseDown={md} onClick={() => wrap('**')}><b>B</b></button>
            <button type="button" title="Italic" aria-label="italic" onMouseDown={md} onClick={() => wrap('*')}><i>I</i></button>
            <button type="button" title="Inline code" aria-label="code" onMouseDown={md} onClick={() => wrap('`')}>{'<>'}</button>
            <button type="button" title="Heading" aria-label="heading" onMouseDown={md} onClick={() => linePrefix('## ')}>H</button>
            <button type="button" title="Bullet list" aria-label="bullet list" onMouseDown={md} onClick={() => linePrefix('- ')}>•</button>
            <button type="button" title="Link" aria-label="link" onMouseDown={md} onClick={link}>🔗</button>
            <label className="rich-color" title="Text color">
              <span aria-hidden="true">A</span>
              <input type="color" aria-label="text color" onChange={(e) => color(e.target.value)} />
            </label>
          </>
        )}
        <button type="button" className={`rich-toggle${preview ? ' on' : ''}`} onClick={() => setPreview((p) => !p)}>
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className={`rich-preview${taClassName ? ` ${taClassName}` : ''}`} dangerouslySetInnerHTML={renderMarkdown(value)} />
      ) : (
        <textarea ref={setRef} className={taClassName} value={value} placeholder={placeholder} onChange={onChange}
          onSelect={remember} onKeyUp={remember} onMouseUp={remember} onBlur={remember}
          style={grow ? { resize: 'none', overflow: 'hidden' } : undefined} />
      )}
    </div>
  );
}
