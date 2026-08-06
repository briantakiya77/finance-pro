import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export type AuthenticatedUser = User;
export type AuthSession = Session;
export type AuthEvent = AuthChangeEvent;

export type AuthState = {
  user: AuthenticatedUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type ResetPasswordPayload = {
  email: string;
};

export type UpdatePasswordPayload = {
  password: string;
};

export type AuthActionResult<T = void> = {
  data: T | null;
  error: string | null;
};

export type AuthStateChangeListener = (event: AuthEvent, session: AuthSession | null) => void;
