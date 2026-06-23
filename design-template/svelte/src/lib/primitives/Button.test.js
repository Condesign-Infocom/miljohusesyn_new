import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders its label', () => {
    render(Button, { props: { label: 'Logga in' } });
    expect(screen.getByText('Logga in')).toBeInTheDocument();
  });
  it('renders a <button> by default and an <a> when href is set', () => {
    const { unmount } = render(Button, { props: { label: 'X' } });
    expect(document.querySelector('button')).toBeInTheDocument();
    unmount();
    render(Button, { props: { label: 'Y', href: '#faktabank' } });
    const a = document.querySelector('a');
    expect(a).toBeInTheDocument();
    expect(a).toHaveAttribute('href', '#faktabank');
  });
  it('applies the leaf background for the primary variant', () => {
    render(Button, { props: { label: 'P', variant: 'primary' } });
    expect(document.querySelector('.bg-leaf')).toBeInTheDocument();
  });
});
