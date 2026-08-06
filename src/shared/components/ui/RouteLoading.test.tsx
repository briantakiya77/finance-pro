import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RouteLoading } from '@/shared/components/ui/RouteLoading';

describe('RouteLoading', () => {
  it('exibe o indicador de carregamento de rota', () => {
    render(<RouteLoading />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Carregando rota...')).toBeTruthy();
  });
});
