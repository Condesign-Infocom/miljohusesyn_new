import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Hero from './Hero.svelte';

describe('Hero', () => {
  it('renders title and highlight props', () => {
    render(Hero, { props: { title: 'Välkommen till', highlight: 'Miljöhusesyn' } });
    expect(screen.getByText('Välkommen till', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Miljöhusesyn')).toBeInTheDocument();
  });
  it('uses the image prop for the background', () => {
    const { container } = render(Hero, { props: { image: '/images/banner-01.jpg' } });
    expect(container.innerHTML).toContain('/images/banner-01.jpg');
  });
});
