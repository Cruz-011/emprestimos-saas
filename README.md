# Cifra Finance

Sistema simples para controlar empréstimos pessoais legais: clientes, contratos, parcelas, pagamentos e caixa. Feito para qualquer pessoa usar no dia a dia, mesmo sem experiência com tecnologia.

Visual: tema escuro fixo (sem alternância clara/escura — decisão deliberada de simplicidade), verde-jade como cor de destaque, e todo valor em R$ aparece em fonte monoespaçada, como uma ficha financeira de verdade.

## O que já está pronto neste esqueleto

- Estrutura do projeto (Next.js 15 + TypeScript + Tailwind)
- Banco de dados completo (`supabase/schema.sql`) com multiempresa e RLS
- Trigger que gera as parcelas automaticamente ao criar um contrato
- Tela de login
- Tela inicial (dashboard) com os cards principais
- Tela de clientes com busca instantânea
- Tela de "novo cliente" (com foto opcional enviada pro Storage)
- Tela de empréstimos (contratos) com status coloridos
- Tela de "novo empréstimo" com busca de cliente e prévia do valor da parcela em tempo real
- Tela de detalhe do empréstimo: linha do tempo das parcelas (pago/parcial/atrasado/a vencer) e registrar pagamento em 1 toque
- Função no banco (`registrar_pagamento_parcela`) que grava o pagamento, joga automaticamente no caixa e recalcula o status do contrato sozinha
- Tela de financeiro/caixa: saldo, entradas x saídas, lançar entrada/saída em 1 toque, exportar CSV
- Capital inicial de caixa: você informa quanto já tinha antes de usar o app (fica salvo em Configurações e soma no saldo)
- Card "Total na rua" no início: quanto está emprestado + juros que ainda falta receber
- Cadastro de empréstimo que já está em andamento: marca "já pago até hoje" e aplica nas parcelas antigas sem duplicar no caixa
- **3 modelos de empréstimo, escolhidos na hora de criar**: parcelas fixas (junta tudo e divide), só juros/rolagem (paga juros e o principal fica em aberto até quitar à parte, com balão no fim) e com amortização (parcela fixa no estilo Tabela Price, abatendo o principal aos poucos)
- **3 periodicidades**: mensal, semanal ou diária — independente da modalidade escolhida
- Prévia em tempo real na tela de "novo empréstimo" já mostra o valor de cada parcela e o valor total do empréstimo antes de salvar, adaptada ao modelo escolhido
- Empréstimo concedido já sai do caixa sozinho ao criar o contrato (função `gerar_parcelas`) — exceto quando é um empréstimo importado/já em andamento
- Painel Super Admin (`/admin`): lista as empresas que usam o sistema, cria empresa nova já com e-mail e senha prontos pro administrador, e bloqueia/libera o acesso de qualquer usuário com 1 toque
- Login detecta o perfil e manda o super admin para `/admin` e o resto para `/dashboard` automaticamente
- Identidade visual "Cifra Finance": tema escuro fixo, verde-jade de destaque, números em fonte mono
- Dashboard agora usa dados reais do Supabase (nada mais é número de exemplo)
- Navegação inferior grande, pensada para celular

## O que falta implementar (próximos passos)

- Exportação em PDF (hoje só tem CSV, que abre certinho no Excel/Google Sheets)
- Notificações automáticas (Vercel Cron chamando a função `marcar_parcelas_atrasadas` + WhatsApp/push)
- Onboarding guiado de primeiro uso
- Geração do PDF do contrato + assinatura eletrônica

## Como colocar para rodar

1. Criar um projeto gratuito em https://supabase.com
2. No SQL Editor do Supabase, colar e rodar o conteúdo de `supabase/schema.sql`
3. Em Storage, criar os buckets privados: `fotos-clientes`, `documentos-clientes`, `comprovantes`, `contratos-assinados`
4. Copiar `.env.example` para `.env.local` e preencher com a URL, a chave anônima e a **chave de serviço** do seu projeto Supabase (Project Settings > API)
5. Criar o primeiro Super Admin (só precisa fazer isso uma vez):
   - No painel do Supabase, vá em Authentication > Users > "Add user" e crie seu usuário (e-mail + senha)
   - Copie o UUID desse usuário
   - No SQL Editor, rode:
     ```sql
     insert into usuarios (id, nome, papel, ativo)
     values ('COLE-O-UUID-AQUI', 'Seu nome', 'super_admin', true);
     ```
   - Pronto: faça login normalmente em `/login` com esse e-mail/senha — você vai cair direto no painel `/admin`
6. Instalar as dependências:
   ```
   npm install
   ```
7. Rodar localmente:
   ```
   npm run dev
   ```
8. Abrir http://localhost:3000

## Como usar no dia a dia (depois de pronto)

- **Início**: veja quanto tem em caixa, quanto está emprestado e quem está atrasado hoje
- **Clientes**: toque em "+" para cadastrar um cliente novo
- **Empréstimos**: toque em "Novo" para criar um empréstimo — as parcelas são geradas sozinhas
- **Cobrar**: na tela inicial, toque em "Cobrar" ao lado do nome da pessoa atrasada para abrir o WhatsApp direto
- **Caixa**: acompanhe entradas e saídas do dinheiro

Tudo foi pensado para funcionar em poucos toques, direto do celular.
