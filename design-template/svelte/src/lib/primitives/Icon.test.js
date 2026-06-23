import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';

describe('Icon', () => {
  it('renders an svg for a valid lucide name', () => {
    const { container } = render(Icon, { props: { name: 'leaf' } });
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
  it('applies the class prop to the svg', () => {
    const { container } = render(Icon, { props: { name: 'search', class: 'h-4 w-4' } });
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });
});
