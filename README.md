# FlowPass — MVP

FlowPass é um sistema de credenciamento inteligente para eventos.

## Estrutura do Projeto

- `apps/web`: Dashboard administrativo em Next.js.
- `apps/mobile`: Aplicativo de leitura de QR code em React Native (Expo).
- `packages/api`: Backend Fastify.
- `packages/database`: Esquema Prisma e migrações.
- `packages/shared`: Tipos e utilitários compartilhados.

## Como rodar localmente

1. **Dependências**:
   ```bash
   pnpm install
   ```

2. **Infraestrutura**:
   Suba o banco de dados e o Redis usando Docker:
   ```bash
   docker-compose up -d
   ```
   O Postgres do Docker fica exposto em `localhost:55432` para não conflitar com instalações locais na porta `5432`.

3. **Configuração**:
   Copie o arquivo `.env.example` para `.env` na raiz e nos pacotes necessários, preenchendo as chaves de API.

4. **Banco de Dados**:
   ```bash
   cd packages/database
   npx prisma migrate dev
   ```

5. **Desenvolvimento**:
   Na raiz do projeto:
   ```bash
   pnpm dev
   ```

## Fluxo de Uso

1. Crie uma empresa via API ou Dashboard.
2. Crie um evento e categorias.
3. Use o link público para inscrições.
4. O QR Code será gerado e enviado por e-mail/WhatsApp.
5. Use o App Mobile para sincronizar e realizar a leitura na entrada (funciona offline).
6. Acompanhe as estatísticas em tempo real no dashboard.
