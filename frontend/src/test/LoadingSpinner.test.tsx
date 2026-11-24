import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders an outer flex container', () => {
    const { container } = render(<LoadingSpinner />);
    const outer = container.querySelector('div') as HTMLElement;
    expect(outer.style.display).toBe('flex');
    expect(outer.style.alignItems).toBe('center');
  });

  it('renders a circular spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    const outer = container.querySelector('div') as HTMLElement;
    // spinner circle is the first div child
    const circle = outer.querySelector('div') as HTMLElement;
    expect(circle).toBeInTheDocument();
    expect(circle.style.borderRadius).toBe('50%');
  });

  it('injects the spin keyframe animation', () => {
    const { container } = render(<LoadingSpinner />);
    const styleTag = container.querySelector('style');
    expect(styleTag?.textContent).toContain('@keyframes spin');
  });
});
