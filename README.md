# Finance Pro

Base inicial do aplicativo financeiro moderno em React, TypeScript, Vite, TailwindCSS,
React Router, React Query e Supabase.

## Como executar

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run lint
npm run build
npm run typecheck
npm run test
npm run format:check
```

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use apenas essas variaveis no frontend. Nunca utilize `SERVICE_ROLE` no codigo do cliente.

Veja a configuracao detalhada em `docs/supabase-setup.md`.
Veja tambem a estrategia de ambientes em `docs/environments.md`.

## Autenticacao

A fundacao tecnica de autenticacao com Supabase Auth esta organizada em `src/modules/auth/`.
Ela inclui provider global, hook de sessao e guardas de rota, mas ainda nao implementa os
formularios completos de login, cadastro e recuperacao de senha.
