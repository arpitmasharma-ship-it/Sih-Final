import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import StatCard, { ScoreRing, ProgressBar } from '../StatCard';
import DataTable, { Pagination } from '../DataTable';
import authReducer from '../../../redux/slices/authSlice';

function renderWithProviders(ui) {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
}

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard icon={() => null} label="Inspections" value={42} />);
    expect(screen.getByText('Inspections')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows a dash for missing values', () => {
    render(<StatCard icon={() => null} label="Reports" value={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('ScoreRing', () => {
  it('displays the score percentage and verdict label', () => {
    render(<ScoreRing value={87} status="COMPLIANT" />);
    expect(screen.getByTestId('score-value')).toHaveTextContent('87%');
  });
});

describe('ProgressBar', () => {
  it('renders the label and clamps values to a width', () => {
    render(<ProgressBar label="Readability" value={64} />);
    expect(screen.getByText(/Readability/i)).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  const rows = [
    { _id: 'a', inspectionId: 'LMC-INS-2026-00001' },
    { _id: 'b', inspectionId: 'LMC-INS-2026-00002' },
  ];

  it('renders rows and headers', () => {
    renderWithProviders(
      <DataTable
        rows={rows}
        columns={[
          { key: 'inspectionId', header: 'Reference' },
        ]}
      />
    );
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('LMC-INS-2026-00001')).toBeInTheDocument();
    expect(screen.getByText('LMC-INS-2026-00002')).toBeInTheDocument();
  });

  it('renders an empty message when no rows exist', () => {
    renderWithProviders(
      <DataTable rows={[]} columns={[{ key: 'x', header: 'X' }]} emptyMessage="Nothing here" />
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('hides itself when there is only one page', () => {
    const { container } = renderWithProviders(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders page buttons across multiple pages', () => {
    renderWithProviders(<Pagination page={2} totalPages={5} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });
});
