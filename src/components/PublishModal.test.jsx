import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const createBuild = vi.fn().mockResolvedValue({ id: 'abc12345' });
vi.mock('../state/gallery.js', () => ({ createBuild }));
vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Z' } }) }));
const { default: PublishModal } = await import('./PublishModal.jsx');

const init = { build: { baseClass: 'rogue', advancedClass: 'assassin', levels: {}, gearStages: [], notes: '', attributes: { str:1,agi:1,vit:1,int:1,dex:1,luk:1 } } };

describe('PublishModal', () => {
  it('requires a name, then publishes the current build', async () => {
    render(<StoreProvider init={init}><PublishModal open onClose={() => {}} /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(createBuild).not.toHaveBeenCalled(); // name empty
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Venomblade' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    await waitFor(() => expect(createBuild).toHaveBeenCalledWith(expect.objectContaining({ name: 'Venomblade', build: expect.objectContaining({ baseClass: 'rogue' }) })));
  });
});
