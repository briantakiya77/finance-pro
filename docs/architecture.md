# Arquitetura do Finance Pro

## Organizacao das pastas

```txt
src/
  app/
    layouts/
    providers/
    router/
    styles/
  modules/
    dashboard/
      components/
      pages/
      queries/
      schemas/
      services/
      types/
  shared/
    components/
    constants/
    hooks/
    lib/
    types/
    utils/
  integrations/
    supabase/
  assets/
```

## Responsabilidade de cada camada

- `app/`: bootstrap da aplicacao, layouts globais, providers, roteamento e estilos globais.
- `modules/`: funcionalidades organizadas por dominio. Cada modulo concentra suas paginas, componentes especificos, contratos, queries, schemas e services do proprio dominio.
- `shared/`: elementos reutilizaveis e agnosticos de dominio, como componentes genericos, hooks utilitarios, helpers, tipos compartilhados e constantes.
- `integrations/`: adaptadores de sistemas externos, SDKs e clientes sem dependencia de componentes React.
- `assets/`: recursos estaticos como imagens e icones.

## Regras de dependencia

- `shared` nao pode importar `modules`.
- `modules` podem importar `shared`.
- `integrations` nao podem depender de componentes React.
- `app` pode importar `modules`, `shared` e `integrations`.
- Modulos nao devem importar arquivos internos de outros modulos diretamente.
- Nenhum segredo deve ficar em codigo executado no navegador.

## Onde colocar componentes

- Componentes globais e reaproveitaveis: `src/shared/components/`.
- Componentes especificos de uma funcionalidade: `src/modules/<modulo>/components/`.
- Layouts estruturais da aplicacao: `src/app/layouts/`.

## Onde colocar regras de negocio

- Regras de negocio ficam dentro de `modules/<modulo>/services`, `modules/<modulo>/schemas` e, quando necessario, em camadas server-side externas ao frontend.
- Componentes React devem apenas orquestrar interface, estado de tela e chamadas para camadas apropriadas.

## Onde colocar integracoes externas

- Integracoes de SDK, cliente HTTP, Supabase e provedores externos ficam em `src/integrations/`.
- Nenhuma integracao externa deve depender de UI.

## Regra obrigatoria

Logica financeira fica proibida dentro de componentes React. Componentes devem renderizar interface e delegar regras de negocio para camadas de dominio apropriadas.
