// Minimal, XSS-safe markdown subset for user notes. Notes travel in shared
// ?build=/?route= links, so we escape ALL html first, then apply a fixed
// whitelist of rules — nothing the user types can become live markup.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeUrl = (u) => /^https?:\/\//i.test(u) ? u : '#';

// Colors: only #rgb / #rrggbb or a small set of named colors. No semicolons,
// url(), or arbitrary CSS — so the style attribute can't be used for injection.
const NAMED = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan',
  'magenta', 'white', 'gray', 'grey', 'black', 'gold', 'teal', 'lime', 'navy', 'maroon', 'silver', 'brown']);
const safeColor = (c) => (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(c) ? c
  : (NAMED.has(String(c).toLowerCase()) ? String(c).toLowerCase() : null));

// Inline rules, applied to already-escaped text.
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\[color=([#\w]+)\]([\s\S]*?)\[\/color\]/gi, (_, c, inner) => {
      const safe = safeColor(c);
      return safe ? `<span style="color:${safe}">${inner}</span>` : inner;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`);
}

export function markdownToHtml(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const flushPara = () => { if (para.length) { out.push(`<p>${para.join('<br>')}</p>`); para = []; } };
  for (const raw of lines) {
    const line = esc(raw);
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara(); closeList();
      const lvl = m[1].length + 3; // h4..h6
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (line.trim() === '') {
      flushPara(); closeList();
    } else {
      closeList();
      para.push(inline(line));
    }
  }
  flushPara(); closeList();
  return out.join('');
}

export function renderMarkdown(text) {
  return { __html: markdownToHtml(text) };
}
