import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { createSupabaseIntegrationMock, resetSupabaseAuthMock } from '@/test/mocks/supabaseAuth';

vi.mock('@/integrations/supabase', () => createSupabaseIntegrationMock());

beforeEach(() => {
  resetSupabaseAuthMock();
});

afterEach(() => {
  cleanup();
});
