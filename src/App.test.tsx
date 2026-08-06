import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App', () => {
  it('renderiza a aplicacao com o layout principal', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Finance Pro' })).toBeTruthy();
    expect(screen.getByText('Ambiente inicial')).toBeTruthy();
  });
});
