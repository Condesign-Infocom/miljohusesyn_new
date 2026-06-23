import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FeatureGrid from './FeatureGrid.svelte';
import Faktabank from './Faktabank.svelte';

describe('FeatureGrid/Faktabank', () => {
  it('FeatureGrid renders one entry per item', () => {
    render(FeatureGrid, {
      props: { title: 'T', items: [{ icon: 'leaf', label: 'A' }, { icon: 'leaf', label: 'B' }, { icon: 'leaf', label: 'C' }] }
    });
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
  it('Faktabank renders its section id anchor', () => {
    const { container } = render(Faktabank, {});
    expect(container.querySelector('#faktabank')).toBeInTheDocument();
  });
});
