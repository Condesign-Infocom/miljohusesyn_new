import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Calculations from './Calculations.svelte';
import News from './News.svelte';
import Contact from './Contact.svelte';

describe('Calculations/News/Contact', () => {
  it('Calculations renders its anchor', () => {
    const { container } = render(Calculations, {});
    expect(container.querySelector('#berakningar')).toBeTruthy();
  });
  it('News renders one entry per item', () => {
    const { getByText } = render(News, {
      props: { title: 'N', items: [{ date: '2026', title: 'One', body: 'x' }, { date: '2026', title: 'Two', body: 'y' }] }
    });
    expect(getByText('One')).toBeTruthy();
    expect(getByText('Two')).toBeTruthy();
  });
  it('Contact renders its anchor', () => {
    const { container } = render(Contact, {});
    expect(container.querySelector('#kontakt')).toBeTruthy();
  });
});
