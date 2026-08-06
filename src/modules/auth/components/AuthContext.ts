import { createContext } from 'react';

import type {
  AuthActionResult,
  AuthCredentials,
  AuthState,
  ResetPasswordPayload,
  UpdatePasswordPayload
} from '@/modules/auth/types/auth';

export type AuthContextValue = AuthState & {
  signIn: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signUp: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<AuthActionResult>;
  updatePassword: (payload: UpdatePasswordPayload) => Promise<AuthActionResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
