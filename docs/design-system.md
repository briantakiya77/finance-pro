# Design System do Finance Pro

O Design System oficial do Finance Pro vive em `src/app/styles/global.css`,
`tailwind.config.ts` e `src/shared/components/ui`. Toda interface nova deve reutilizar essas
definicoes antes de criar estilos locais.

## Tokens

- Cores: `background`, `surface`, `surface-secondary`, `surface-hover`, `border`,
  `text-primary`, `text-secondary`, `accent`, `accent-secondary`, `success`, `warning`, `danger`,
  `income` e `expense`.
- Tipografia: `text-display`, `text-title`, `text-heading`, `text-body` e `text-caption`.
- Formas: `rounded-control` para controles e `rounded-panel` para superficies.
- Sombras: `shadow-panel`, `shadow-elevated` e `shadow-glow`.
- Movimento: `duration-fast`, `duration-normal`, `duration-slow` e `--ease-premium`.
- Icones: tamanhos CSS `--icon-sm`, `--icon-md` e `--icon-lg`; use Lucide Icons.
- Destaque: `bg-accent-gradient` e `bg-accent-gradient-soft`.

## Componentes

Importe as primitivas pelo barrel `@/shared/components/ui`. Estao disponiveis Button, IconButton,
Card, Input, Select, Checkbox, Switch, Radio, Badge, Modal, Tabs, Table, Menu, ContextMenu, Toast,
Tooltip, Skeleton, RouteLoading e PageHeader.

Componentes de dominio continuam dentro de `src/modules`. Eles podem compor primitivas de
`shared`, mas nao devem duplicar cores, raios, sombras ou transicoes. Cores recebidas como dado de
negocio, como a cor escolhida para uma conta, podem ser aplicadas dinamicamente.

## Regras de uso

1. Nao use valores hexadecimais ou RGB dentro de componentes React.
2. Use peso `font-semibold` somente em titulos, valores de destaque e identificadores curtos.
3. Preserve contraste, foco visivel, rotulos acessiveis e suporte a movimento reduzido.
4. Mantenha cards com `rounded-panel`, borda `border-border` e uma das sombras semanticas.
5. Animacoes devem usar Framer Motion, ser breves e respeitar `prefers-reduced-motion`.
6. Componentes React nao devem conter regras financeiras; a camada visual apenas apresenta dados.
