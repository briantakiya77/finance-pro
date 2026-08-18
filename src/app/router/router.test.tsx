import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';
import { createMockSession, setMockSession } from '@/test/mocks/supabaseAuth';

describe('router', () => {
  it('carrega a rota inicial do dashboard', async () => {
    setMockSession(createMockSession());

    render(<App />);

    const links = await screen.findAllByRole('link', { name: 'Inicio' });

    expect(links.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
  });
});
