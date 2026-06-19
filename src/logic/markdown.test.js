import { describe, it, expect } from 'vitest';
import { markdownToHtml } from './markdown.js';

describe('markdownToHtml', () => {
  it('renders bold, italic, code', () => {
    expect(markdownToHtml('**hi**')).toContain('<strong>hi</strong>');
    expect(markdownToHtml('*hi*')).toContain('<em>hi</em>');
    expect(markdownToHtml('`x`')).toContain('<code>x</code>');
  });
  it('renders unordered lists', () => {
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
  });
  it('renders headers', () => {
    expect(markdownToHtml('## Title')).toBe('<h5>Title</h5>');
  });
  it('only allows http(s) links', () => {
    expect(markdownToHtml('[x](https://a.com)')).toContain('href="https://a.com"');
    expect(markdownToHtml('[x](javascript:alert(1))')).toContain('href="#"');
  });
  it('renders only safe colors', () => {
    expect(markdownToHtml('[color=#ff0000]hi[/color]')).toContain('<span style="color:#ff0000">hi</span>');
    expect(markdownToHtml('[color=red]hi[/color]')).toContain('<span style="color:red">hi</span>');
    // A well-formed token with a non-hex/non-named value is dropped; inner survives, no span.
    const bad = markdownToHtml('[color=zzz]hi[/color]');
    expect(bad).toContain('hi');
    expect(bad).not.toContain('<span');
    // CSS-injection chars don't even match the token, and never yield a style attribute.
    const evil = markdownToHtml('[color=red;background:url(x)]hi[/color]');
    expect(evil).not.toContain('<span');
    expect(evil).not.toContain('style=');
  });
  it('escapes html (no script injection from shared notes)', () => {
    const out = markdownToHtml('<script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });
});
