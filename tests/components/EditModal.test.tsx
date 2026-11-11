import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditModal from '@/components/EditModal';

function deferred() {
  let resolve!: (value: string) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const props = {
  isOpen: true,
  title: 'Key Partners',
  initialContent: 'Original fictional partners',
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('EditModal refinement ownership', () => {
  it('applies and saves a refinement when the draft is unchanged', async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<EditModal {...props} onSave={save} onRefine={async () => 'Refined partners'} />);
    await user.click(screen.getByRole('button', { name: 'Refine with AI' }));
    expect(screen.getByPlaceholderText('Enter your content here...')).toHaveValue('Refined partners');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(save).toHaveBeenCalledWith('Refined partners');
  });

  it('keeps manual edits made while a refinement is pending', async () => {
    const user = userEvent.setup();
    const request = deferred();
    render(<EditModal {...props} onRefine={() => request.promise} />);
    await user.click(screen.getByRole('button', { name: 'Refine with AI' }));
    const editor = screen.getByPlaceholderText('Enter your content here...');
    await user.clear(editor);
    await user.type(editor, 'Newer manual partners');
    await act(async () => { request.resolve('Refined old partners'); await request.promise; });
    expect(editor).toHaveValue('Newer manual partners');
    expect(screen.getByRole('button', { name: 'Refine with AI' })).toBeEnabled();
  });

  it('does not let an old block response replace or finish a new block request', async () => {
    const user = userEvent.setup();
    const oldRequest = deferred();
    const newRequest = deferred();
    const refine = vi.fn().mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const { rerender } = render(<EditModal {...props} initialContent="Shared draft" onRefine={refine} />);
    await user.click(screen.getByRole('button', { name: 'Refine with AI' }));
    // Different blocks can legitimately have identical content.
    rerender(<EditModal {...props} title="Key Activities" initialContent="Shared draft" onRefine={refine} />);
    expect(screen.getByRole('button', { name: 'Refine with AI' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Refine with AI' }));
    await act(async () => { oldRequest.resolve('Old partners reply'); await oldRequest.promise; });
    expect(screen.getByPlaceholderText('Enter your content here...')).toHaveValue('Shared draft');
    expect(screen.getByRole('button', { name: 'Refining...' })).toBeDisabled();
    await act(async () => { newRequest.resolve('New activities reply'); await newRequest.promise; });
    expect(screen.getByPlaceholderText('Enter your content here...')).toHaveValue('New activities reply');
  });

  it('starts a fresh session when the same block is closed and reopened', async () => {
    const user = userEvent.setup();
    const request = deferred();
    const refine = () => request.promise;
    const { rerender } = render(<EditModal {...props} onRefine={refine} />);
    await user.click(screen.getByRole('button', { name: 'Refine with AI' }));
    rerender(<EditModal {...props} isOpen={false} onRefine={refine} />);
    rerender(<EditModal {...props} onRefine={refine} />);
    expect(screen.getByRole('button', { name: 'Refine with AI' })).toBeEnabled();
    await act(async () => { request.resolve('Closed session reply'); await request.promise; });
    expect(screen.getByPlaceholderText('Enter your content here...')).toHaveValue(props.initialContent);
  });

  it('keeps the draft editable after a refinement rejects', async () => {
    const user = userEvent.setup();
    const request = deferred();
    render(<EditModal {...props} onRefine={() => request.promise} />);
    await user.click(screen.getByRole('button', { name: 'Refine with AI' }));
    await act(async () => { request.reject(new Error('Fictional provider failure')); await request.promise.catch(() => {}); });
    expect(screen.getByPlaceholderText('Enter your content here...')).toHaveValue(props.initialContent);
    expect(screen.getByRole('button', { name: 'Refine with AI' })).toBeEnabled();
  });
});
