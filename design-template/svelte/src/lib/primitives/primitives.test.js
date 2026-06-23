import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Badge from './Badge.svelte';
import NavLink from './NavLink.svelte';
import SearchBar from './SearchBar.svelte';

describe('primitives', () => {
  it('Badge renders its label', () => {
    render(Badge, { props: { label: 'Ett verktyg från LRF' } });
    expect(screen.getByText('Ett verktyg från LRF')).toBeInTheDocument();
  });
  it('NavLink renders an anchor with href + label', () => {
    render(NavLink, { props: { href: '#hem', label: 'Hem' } });
    const a = screen.getByText('Hem');
    expect(a.closest('a')).toHaveAttribute('href', '#hem');
  });
  it('SearchBar renders an input with the placeholder and a button', () => {
    render(SearchBar, { props: { placeholder: 'Sök', buttonLabel: 'Sök' } });
    expect(screen.getByPlaceholderText('Sök')).toBeInTheDocument();
    expect(document.querySelector('button')).toBeInTheDocument();
  });
});
