# Configuracao do Supabase

## Onde configurar as variaveis

Crie um arquivo `.env.local` na raiz do projeto com:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Essas sao as unicas variaveis de Supabase permitidas no frontend.

## Regras importantes

- Nunca use `SERVICE_ROLE` no frontend.
- Segredos administrativos devem ficar apenas em ambientes server-side futuros.
- O cliente web deve usar apenas a chave anonima publica.

## Como a integracao esta organizada

- `src/integrations/supabase/client.ts`: cria e centraliza a unica instancia do cliente Supabase.
- `src/integrations/supabase/index.ts`: ponto publico de exportacao da integracao.
- `src/integrations/supabase/types.ts`: tipos do banco para uso futuro.
- `src/shared/lib/env.ts`: valida as variaveis de ambiente com Zod.

## O que ja esta preparado

- Authentication
- Database
- Storage
- Edge Functions

Essas capacidades estao expostas pela camada `supabaseServices`, sem implementar nenhuma funcionalidade de negocio.

## Authentication na arquitetura

- `src/modules/auth/services/authService.ts` encapsula as chamadas do Supabase Auth.
- `src/modules/auth/components/AuthProvider.tsx` carrega a sessao inicial e observa `onAuthStateChange`.
- `src/modules/auth/hooks/useAuth.ts` expoe o estado autenticado para a interface.
- `src/modules/auth/routes/ProtectedRoute.tsx` e `PublicOnlyRoute.tsx` controlam acesso visual a rotas.

Autenticacao identifica o usuario. Autorizacao de dados continuara dependendo de RLS no Supabase.

## Comportamento das variaveis

- Em desenvolvimento: o projeto mostra um aviso amigavel no console quando o Supabase ainda nao foi configurado.
- Em producao: a validacao falha de forma segura se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estiverem ausentes.
