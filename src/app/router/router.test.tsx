import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('router', () => {
  it('carrega a rota inicial do dashboard', async () => {
    render(<App />);

    expect(await screen.findByText('Fundacao inicial')).toBeTruthy();
  });
});
