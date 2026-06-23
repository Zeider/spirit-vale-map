import { describe, it, expect } from 'vitest';
import { supabase } from './supabaseClient.js';

describe('supabaseClient', () => {
  it('exposes auth + from()', () => {
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.from).toBe('function');
  });
});
