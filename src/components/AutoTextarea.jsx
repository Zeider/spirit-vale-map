import { useRef, useLayoutEffect } from 'react';

// A textarea that auto-grows to fit its content (so the full note shows on open,
// no manual stretching). Re-measures whenever the value changes.
export default function AutoTextarea({ value, onChange, className, placeholder, minHeight = 56 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(minHeight, ta.scrollHeight)}px`;
  }, [value]);
  return (
    <textarea ref={ref} className={className} value={value} placeholder={placeholder} onChange={onChange}
      style={{ resize: 'none', overflow: 'hidden' }} />
  );
}
