import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { vi } from 'vitest';

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

let currentSession: Session | null = null;
let authListeners: AuthListener[] = [];
let subscriptionUnsubscribeSpies: ReturnType<typeof vi.fn>[] = [];

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-06T00:00:00.000Z',
    email: 'brian@example.com',
    ...overrides
  } as User;
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  const user = overrides.user ?? createMockUser();

  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
    ...overrides
  } as Session;
}

export function setMockSession(session: Session | null) {
  currentSession = session;
}

export function emitAuthStateChange(event: AuthChangeEvent, session: Session | null) {
  currentSession = session;
  authListeners.forEach((listener) => listener(event, session));
}

export function getLastUnsubscribeSpy() {
  return subscriptionUnsubscribeSpies.at(-1);
}

export function resetSupabaseAuthMock() {
  currentSession = null;
  authListeners = [];
  subscriptionUnsubscribeSpies = [];
  authMock.getSession.mockReset();
  authMock.getSession.mockImplementation(async () => ({
    data: { session: currentSession },
    error: null
  }));
  authMock.onAuthStateChange.mockReset();
  authMock.onAuthStateChange.mockImplementation((listener: AuthListener) => {
    authListeners.push(listener);

    const unsubscribe = vi.fn(() => {
      authListeners = authListeners.filter((registeredListener) => registeredListener !== listener);
    });

    subscriptionUnsubscribeSpies.push(unsubscribe);

    return {
      data: {
        subscription: {
          unsubscribe
        }
      }
    };
  });
  authMock.signInWithPassword.mockReset();
  authMock.signInWithPassword.mockResolvedValue({
    data: { user: null, session: currentSession },
    error: null
  });
  authMock.signUp.mockReset();
  authMock.signUp.mockResolvedValue({
    data: { user: null, session: currentSession },
    error: null
  });
  authMock.signOut.mockReset();
  authMock.signOut.mockResolvedValue({ error: null });
  authMock.resetPasswordForEmail.mockReset();
  authMock.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  authMock.updateUser.mockReset();
  authMock.updateUser.mockResolvedValue({ data: { user: null }, error: null });
}

const authMock = {
  getSession: vi.fn(async () => ({
    data: { session: currentSession },
    error: null
  })),
  onAuthStateChange: vi.fn((listener: AuthListener) => {
    authListeners.push(listener);

    const unsubscribe = vi.fn(() => {
      authListeners = authListeners.filter((registeredListener) => registeredListener !== listener);
    });

    subscriptionUnsubscribeSpies.push(unsubscribe);

    return {
      data: {
        subscription: {
          unsubscribe
        }
      }
    };
  }),
  signInWithPassword: vi.fn(async () => ({
    data: { user: null, session: currentSession },
    error: null
  })),
  signUp: vi.fn(async () => ({
    data: { user: null, session: currentSession },
    error: null
  })),
  signOut: vi.fn(async () => ({ error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
  updateUser: vi.fn(async () => ({ data: { user: null }, error: null }))
};

export function getSupabaseAuthMock() {
  return authMock;
}

function createQueryMock(tableName: string) {
  const query = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    insert: vi.fn(() => query),
    is: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(async () => ({
      data: [],
      error: null
    })),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({
      data: null,
      error: null
    })),
    update: vi.fn(() => query),
    then: (resolve: (value: unknown) => void) => {
      const response =
        tableName === 'accounts'
          ? { count: 0, data: [], error: null }
          : { data: [], error: null };

      return Promise.resolve(response).then(resolve);
    }
  };

  return query;
}

export function createSupabaseIntegrationMock() {
  const client = {
    auth: authMock,
    from: vi.fn((tableName: string) => createQueryMock(tableName)),
    rpc: vi.fn(async () => ({
      data: null,
      error: null
    })),
    storage: {},
    functions: {}
  };

  return {
    getSupabaseClient: () => client,
    isSupabaseConfigured: true,
    requireSupabaseClient: () => client,
    supabase: client,
    supabaseServices: {
      auth: () => authMock,
      database: () => client,
      functions: () => client.functions,
      storage: () => client.storage
    }
  };
}
