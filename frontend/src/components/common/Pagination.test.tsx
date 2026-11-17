import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    page: 0,
    pageSize: 10,
    totalElements: 45,
    totalPages: 5,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('renders pagination bar with item range and total count', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId('pagination-menu')).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/^Page/i)).toHaveTextContent('Page 1 of 5');
  });

  it('disables previous and first page buttons on page 0', () => {
    render(<Pagination {...defaultProps} page={0} />);
    const prevBtn = screen.getByRole('button', { name: 'Previous page' });
    const firstBtn = screen.getByRole('button', { name: 'First page' });
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    const lastBtn = screen.getByRole('button', { name: 'Last page' });

    expect(prevBtn).toBeDisabled();
    expect(firstBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
    expect(lastBtn).toBeEnabled();
  });

  it('disables next and last page buttons on final page', () => {
    render(<Pagination {...defaultProps} page={4} totalPages={5} />);
    const prevBtn = screen.getByRole('button', { name: 'Previous page' });
    const firstBtn = screen.getByRole('button', { name: 'First page' });
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    const lastBtn = screen.getByRole('button', { name: 'Last page' });

    expect(prevBtn).toBeEnabled();
    expect(firstBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
  });

  it('calls onPageChange when clicking Next, Previous, First, and Last page buttons', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        {...defaultProps}
        page={2}
        totalPages={5}
        onPageChange={onPageChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: 'First page' }));
    expect(onPageChange).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageSizeChange when selecting a different page size', () => {
    const onPageSizeChange = vi.fn();
    render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);

    const select = screen.getByRole('combobox', { name: 'Rows per page' });
    fireEvent.change(select, { target: { value: '20' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it('disables all controls when disabled prop is true', () => {
    render(<Pagination {...defaultProps} page={2} totalPages={5} disabled={true} />);

    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled();
  });

  it('handles zero totalElements cleanly', () => {
    render(<Pagination {...defaultProps} totalElements={0} totalPages={0} page={0} />);
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 0 to 0 of 0 items');
  });
});
