# CLAUDE.md

## Sobre o Projeto

Extensão de navegador que armazena o currículo do usuário em PDF e sua API key do Gemini para preenchimento automático de formulários.

## Diretrizes de Desenvolvimento

- **Framework UI**: Sempre usar Angular Material 3+ (MDC-based components)
- **Abordagens**: Optar sempre pelas abordagens mais recentes do Angular
- **Reatividade**: Usar sempre **signals** (`signal()`, `computed()`, `effect()`) em vez de RxJS quando possível
- **State Management**: Preferir signals para gerenciamento de estado
- **Components**: Usar standalone components
- **Control Flow**: Usar a nova sintaxe de template (`@if`, `@for`, `@switch`) em vez de `*ngIf`, `*ngFor`
