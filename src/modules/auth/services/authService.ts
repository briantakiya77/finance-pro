import type { Subscription } from '@supabase/supabase-js';

import { requireSupabaseClient, supabaseServices } from '@/integrations/supabase';
import {
  authCredentialsSchema,
  resetPasswordSchema,
  updatePasswordSchema
} from '@/modules/auth/schemas/authSchemas';
import type {
  AuthActionResult,
  AuthCredentials,
  AuthSession,
  AuthStateChangeListener,
  ResetPasswordPayload,
  UpdatePasswordPayload
} from '@/modules/auth/types/auth';

const defaultAuthErrorMessage =
  'Nao foi possivel concluir a operacao de autenticacao no momento. Tente novamente.';

const authErrorMessages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha invalidos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Ja existe uma conta cadastrada com este e-mail.',
  'Signup is disabled': 'O cadastro ainda nao esta disponivel.',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'Auth session missing!': 'Sua sessao de recuperacao nao esta disponivel. Solicite um novo link.'
};

function mapAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message in authErrorMessages) {
    return authErrorMessages[error.message];
  }

  return defaultAuthErrorMessage;
}

async function resolveAuthOperation(operation: Promise<{ error: Error | null }>) {
  try {
    const response = await operation;

    if (response.error) {
      return {
        data: null,
        error: mapAuthErrorMessage(response.error)
      } satisfies AuthActionResult;
    }

    return {
      data: null,
      error: null
    } satisfies AuthActionResult;
  } catch (error) {
    return {
      data: null,
      error: mapAuthErrorMessage(error)
    } satisfies AuthActionResult;
  }
}

export const authService = {
  async getCurrentSession(): Promise<AuthActionResult<AuthSession>> {
    try {
      const client = requireSupabaseClient();
      const { data, error } = await client.auth.getSession();

      if (error) {
        return {
          data: null,
          error: mapAuthErrorMessage(error)
        };
      }

      return {
        data: data.session,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: mapAuthErrorMessage(error)
      };
    }
  },

  onAuthStateChange(listener: AuthStateChangeListener): Subscription {
    const { data } = supabaseServices.auth().onAuthStateChange(listener);
    return data.subscription;
  },

  async signIn(credentials: AuthCredentials): Promise<AuthActionResult> {
    const parsedCredentials = authCredentialsSchema.safeParse(credentials);

    if (!parsedCredentials.success) {
      return {
        data: null,
        error: parsedCredentials.error.issues[0]?.message ?? defaultAuthErrorMessage
      };
    }

    return resolveAuthOperation(supabaseServices.auth().signInWithPassword(parsedCredentials.data));
  },

  async signUp(credentials: AuthCredentials): Promise<AuthActionResult> {
    const parsedCredentials = authCredentialsSchema.safeParse(credentials);

    if (!parsedCredentials.success) {
      return {
        data: null,
        error: parsedCredentials.error.issues[0]?.message ?? defaultAuthErrorMessage
      };
    }

    return resolveAuthOperation(supabaseServices.auth().signUp(parsedCredentials.data));
  },

  async signOut(): Promise<AuthActionResult> {
    try {
      const { error } = await supabaseServices.auth().signOut();

      if (error) {
        return {
          data: null,
          error: mapAuthErrorMessage(error)
        };
      }

      return {
        data: null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: mapAuthErrorMessage(error)
      };
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthActionResult> {
    const parsedPayload = resetPasswordSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return {
        data: null,
        error: parsedPayload.error.issues[0]?.message ?? defaultAuthErrorMessage
      };
    }

    try {
      const { error } = await supabaseServices
        .auth()
        .resetPasswordForEmail(parsedPayload.data.email, {
          redirectTo: `${window.location.origin}/nova-senha`
        });

      if (error) {
        return {
          data: null,
          error: mapAuthErrorMessage(error)
        };
      }

      return {
        data: null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: mapAuthErrorMessage(error)
      };
    }
  },

  async updatePassword(payload: UpdatePasswordPayload): Promise<AuthActionResult> {
    const parsedPayload = updatePasswordSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return {
        data: null,
        error: parsedPayload.error.issues[0]?.message ?? defaultAuthErrorMessage
      };
    }

    try {
      const { error } = await supabaseServices.auth().updateUser(parsedPayload.data);

      if (error) {
        return {
          data: null,
          error: mapAuthErrorMessage(error)
        };
      }

      return {
        data: null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: mapAuthErrorMessage(error)
      };
    }
  }
};
