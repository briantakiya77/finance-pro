# Estrategia de Ambientes

## Objetivo

O Finance Pro usa uma estrategia simples e segura:

- o frontend acessa apenas variaveis publicas com prefixo `VITE_`
- segredos administrativos ficam reservados para camadas server-side futuras
- Supabase e aplicacao web devem poder evoluir por ambiente sem alterar o codigo-fonte

## Frontend atual

No frontend, somente estas variaveis sao permitidas:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nenhuma outra credencial do Supabase deve ser usada no cliente.

## Arquivos de ambiente

- `.env.example`: modelo versionado para onboarding.
- `.env.local`: configuracao local do desenvolvedor.
- `.env.production`: configuracao de build/producao fora do Git.

Arquivos locais e de producao ficam ignorados pelo Git.

## Responsabilidades por camada

- Frontend web:
  usa apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Server-side futuro:
  podera usar segredos administrativos, tokens privados e integracoes sensiveis.
- Supabase:
  concentra banco, auth, storage e edge functions.

## Comportamento por ambiente

- Desenvolvimento:
  se as variaveis estiverem ausentes, o projeto emite aviso amigavel no console e continua carregando a interface.
- Producao:
  se as variaveis estiverem ausentes, a validacao falha de forma segura.

## Fluxo recomendado

### Local

Crie `.env.local`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Preview

Defina as mesmas variaveis no provedor que publicar o frontend de preview.

### Producao

Defina as mesmas variaveis no ambiente de producao do frontend.

## Regras obrigatorias

- Nunca usar `SERVICE_ROLE` no frontend.
- Nunca commitar `.env`, `.env.local` ou `.env.production`.
- Nunca misturar variaveis publicas do cliente com segredos de backend.
- Toda nova variavel de frontend deve passar pela camada `src/shared/lib/env.ts`.
