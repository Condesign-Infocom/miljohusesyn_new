import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Header from './Header.svelte';
import Footer from './Footer.svelte';

describe('Header/Footer', () => {
  it('Header renders the brand and all nav links', () => {
    render(Header, {
      props: {
        brand: 'Miljöhusesyn',
        links: [
          { href: '#hem', label: 'Hem' },
          { href: '#faktabank', label: 'Faktabank' }
        ]
      }
    });
    expect(screen.getByText('Miljöhusesyn')).toBeInTheDocument();
    expect(screen.getAllByText('Faktabank').length).toBeGreaterThan(0);
  });
  it('Footer renders without crashing and shows a footer element', () => {
    render(Footer, {});
    expect(document.querySelector('footer')).toBeInTheDocument();
  });
});
