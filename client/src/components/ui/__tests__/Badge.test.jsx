import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge, { CheckStatusBadge } from '../Badge';

describe('Badge', () => {
  it('renders the label for a known status', () => {
    render(<Badge status="COMPLIANT" />);
    expect(screen.getByTestId('status-COMPLIANT')).toHaveTextContent('Compliant');
  });

  it('falls back gracefully for unknown status', () => {
    render(<Badge status="SOMETHING_ELSE" />);
    expect(screen.getByTestId('status-SOMETHING_ELSE')).toHaveTextContent('SOMETHING_ELSE');
  });

  it('supports an explicit label override', () => {
    render(<Badge status="COMPLIANT" label="active" size="xs" />);
    expect(screen.getByTestId('status-COMPLIANT')).toHaveTextContent('active');
  });

  it('renders severity variant without a dot', () => {
    render(<Badge severity="CRITICAL" />);
    expect(screen.getByTestId('sev-CRITICAL')).toBeInTheDocument();
  });
});

describe('CheckStatusBadge', () => {
  it('renders PASS / FAIL / WARNING statuses', () => {
    render(
      <>
        <CheckStatusBadge status="PASS" />
        <CheckStatusBadge status="FAIL" />
        <CheckStatusBadge status="WARNING" />
      </>
    );
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });
});
