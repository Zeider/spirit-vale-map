import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const sendFeedback = vi.fn().mockResolvedValue(undefined);
vi.mock('../state/feedback.js', () => ({ sendFeedback }));
const { default: FeedbackModal } = await import('./FeedbackModal.jsx');

describe('FeedbackModal', () => {
  it('requires a message, then sends and shows thanks', async () => {
    render(<FeedbackModal open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(sendFeedback).not.toHaveBeenCalled(); // empty message blocked
    fireEvent.change(screen.getByLabelText(/feedback message/i), { target: { value: 'the route is broken' } });
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    await waitFor(() => expect(sendFeedback).toHaveBeenCalledWith(expect.objectContaining({ message: 'the route is broken', type: 'bug' })));
    await screen.findByText(/thanks/i);
  });
  it('renders nothing when closed', () => {
    const { container } = render(<FeedbackModal open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
