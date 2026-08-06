import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';
import { createMockSession, setMockSession } from '@/test/mocks/supabaseAuth';

describe('App', () => {
  it('renderiza a aplicacao com o layout principal', async () => {
    setMockSession(createMockSession());

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Finance Pro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Notificacoes' })).toBeTruthy();
  });
});
