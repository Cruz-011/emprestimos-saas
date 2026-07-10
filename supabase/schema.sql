-- ============================================================
-- SCHEMA: SaaS de Gestão de Empréstimos Pessoais Legais
-- Multi-tenant via empresa_id + RLS
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- EMPRESAS ----------
create table empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cnpj_cpf text,
  telefone text,
  taxa_juros_maxima numeric(5,2) default 12.00, -- % ao mês, ajustável, só um alerta de referência
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- USUARIOS (perfis vinculados a auth.users) ----------
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('super_admin', 'admin_empresa', 'agente')),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- ---------- CLIENTES ----------
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  cpf text,
  telefone text,
  endereco text,
  foto_url text,
  rg_url text,
  cnh_url text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references usuarios(id)
);
create index idx_clientes_empresa on clientes(empresa_id);
create index idx_clientes_busca on clientes using gin (to_tsvector('portuguese', nome || ' ' || coalesce(cpf,'') || ' ' || coalesce(telefone,'')));

-- ---------- CONTRATOS ----------
create table contratos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  valor_emprestado numeric(12,2) not null,
  taxa_juros numeric(5,2) not null, -- % por período (o período depende de "periodicidade")
  numero_parcelas int not null,
  data_primeiro_vencimento date not null,
  modalidade text not null default 'parcelas_fixas'
    check (modalidade in ('parcelas_fixas', 'rolagem', 'amortizacao')),
  periodicidade text not null default 'mensal'
    check (periodicidade in ('diario', 'semanal', 'mensal')),
  status text not null default 'ativo' check (status in ('ativo','quitado','atrasado','cancelado')),
  contrato_pdf_url text,
  assinado boolean default false,
  importado boolean not null default false, -- true = empréstimo que já estava em andamento antes de usar o app
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references usuarios(id)
);
create index idx_contratos_empresa on contratos(empresa_id);
create index idx_contratos_cliente on contratos(cliente_id);

-- ---------- PARCELAS ----------
create table parcelas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,
  numero int not null,
  valor numeric(12,2) not null,
  valor_juros numeric(12,2), -- só preenchido no modelo "amortizacao"
  valor_principal numeric(12,2), -- só preenchido no modelo "amortizacao"
  tipo text not null default 'parcela' check (tipo in ('parcela', 'somente_juros', 'balao')),
  data_vencimento date not null,
  status text not null default 'a_vencer' check (status in ('a_vencer','pago','atrasado','parcial')),
  valor_pago numeric(12,2) default 0,
  data_pagamento date
);
create index idx_parcelas_contrato on parcelas(contrato_id);
create index idx_parcelas_vencimento on parcelas(data_vencimento);

-- ---------- PAGAMENTOS ----------
create table pagamentos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  parcela_id uuid not null references parcelas(id) on delete cascade,
  valor numeric(12,2) not null,
  forma_pagamento text, -- pix, dinheiro, transferencia...
  comprovante_url text,
  registrado_por uuid references usuarios(id),
  created_at timestamptz default now()
);

-- ---------- MOVIMENTACOES FINANCEIRAS ----------
create table movimentacoes_financeiras (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  categoria text,
  valor numeric(12,2) not null,
  descricao text,
  data date default current_date,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- ---------- NOTIFICACOES ----------
create table notificacoes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  titulo text not null,
  mensagem text,
  lida boolean default false,
  created_at timestamptz default now()
);

-- ---------- DOCUMENTOS ----------
create table documentos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete cascade,
  contrato_id uuid references contratos(id) on delete cascade,
  tipo text, -- rg, cpf, cnh, comprovante, contrato_assinado
  url text not null,
  created_at timestamptz default now()
);

-- ---------- LOGS (auditoria) ----------
create table logs (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  acao text not null,
  entidade text,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz default now()
);

-- ---------- CONFIGURACOES ----------
create table configuracoes (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  tema text default 'auto',
  notificacoes_whatsapp boolean default true,
  dias_lembrete_antes int default 1,
  capital_inicial numeric(12,2) default 0
);

-- ============================================================
-- RLS: isolamento total por empresa_id
-- ============================================================
alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table contratos enable row level security;
alter table parcelas enable row level security;
alter table pagamentos enable row level security;
alter table movimentacoes_financeiras enable row level security;
alter table notificacoes enable row level security;
alter table documentos enable row level security;
alter table logs enable row level security;
alter table configuracoes enable row level security;

-- Função helper: empresa do usuário logado
-- (security definer é necessário: sem isso, a query abaixo dispararia
-- a própria RLS de "usuarios" e causaria recursão infinita)
create or replace function auth_empresa_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid();
$$;

-- Função helper: o usuário logado é super admin?
create or replace function auth_e_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select papel = 'super_admin' from usuarios where id = auth.uid()), false);
$$;

-- Política padrão (repetir/ajustar por tabela): só enxerga dados da própria empresa
create policy "empresa_isolada_clientes" on clientes
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_contratos" on contratos
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_parcelas" on parcelas
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_pagamentos" on pagamentos
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_financeiro" on movimentacoes_financeiras
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_notificacoes" on notificacoes
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_documentos" on documentos
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_logs" on logs
  for all using (empresa_id = auth_empresa_id());
create policy "empresa_isolada_config" on configuracoes
  for all using (empresa_id = auth_empresa_id());
create policy "usuario_ve_propria_empresa" on empresas
  for select using (id = auth_empresa_id() or auth_e_super_admin());
create policy "super_admin_gerencia_empresas" on empresas
  for insert with check (auth_e_super_admin());
create policy "super_admin_atualiza_empresas" on empresas
  for update using (auth_e_super_admin());
create policy "usuario_ve_colegas_empresa" on usuarios
  for select using (empresa_id = auth_empresa_id() or auth_e_super_admin());
create policy "super_admin_atualiza_usuarios" on usuarios
  for update using (auth_e_super_admin());

-- ============================================================
-- TRIGGER: ao criar contrato, gerar parcelas automaticamente
-- Suporta 3 modelos de cobrança (modalidade) e 3 periodicidades.
-- ============================================================
create or replace function gerar_parcelas()
returns trigger
language plpgsql
as $$
declare
  i int;
  passo interval;
  venc date;
  taxa numeric := new.taxa_juros / 100;
  valor_parcela numeric(12,2);
  juros_periodo numeric(12,2);
  saldo numeric(12,2);
  juros numeric(12,2);
  amortizacao_valor numeric(12,2);
  fator numeric;
begin
  passo := case new.periodicidade
    when 'diario' then interval '1 day'
    when 'semanal' then interval '1 week'
    else interval '1 month'
  end;

  if new.modalidade = 'parcelas_fixas' then
    -- juros simples sobre o total, dividido em parcelas iguais
    valor_parcela := round((new.valor_emprestado * (1 + taxa * new.numero_parcelas)) / new.numero_parcelas, 2);
    for i in 1..new.numero_parcelas loop
      venc := new.data_primeiro_vencimento + ((i - 1) * passo);
      insert into parcelas (empresa_id, contrato_id, numero, valor, data_vencimento, tipo)
      values (new.empresa_id, new.id, i, valor_parcela, venc, 'parcela');
    end loop;

  elsif new.modalidade = 'rolagem' then
    -- paga só os juros a cada período; o principal só vence inteiro na última parcela (balão)
    juros_periodo := round(new.valor_emprestado * taxa, 2);
    for i in 1..new.numero_parcelas loop
      venc := new.data_primeiro_vencimento + ((i - 1) * passo);
      if i < new.numero_parcelas then
        insert into parcelas (empresa_id, contrato_id, numero, valor, data_vencimento, tipo)
        values (new.empresa_id, new.id, i, juros_periodo, venc, 'somente_juros');
      else
        insert into parcelas (empresa_id, contrato_id, numero, valor, data_vencimento, tipo)
        values (new.empresa_id, new.id, i, juros_periodo + new.valor_emprestado, venc, 'balao');
      end if;
    end loop;

  elsif new.modalidade = 'amortizacao' then
    -- Tabela Price: parcela fixa, mas a composição juros/principal muda a cada período
    fator := power(1 + taxa, new.numero_parcelas);
    valor_parcela := round(new.valor_emprestado * (taxa * fator) / (fator - 1), 2);
    saldo := new.valor_emprestado;
    for i in 1..new.numero_parcelas loop
      venc := new.data_primeiro_vencimento + ((i - 1) * passo);
      juros := round(saldo * taxa, 2);
      amortizacao_valor := valor_parcela - juros;
      if i = new.numero_parcelas then
        amortizacao_valor := saldo; -- ajusta arredondamento na última parcela
      end if;
      saldo := saldo - amortizacao_valor;
      insert into parcelas (empresa_id, contrato_id, numero, valor, valor_juros, valor_principal, data_vencimento, tipo)
      values (new.empresa_id, new.id, i, juros + amortizacao_valor, juros, amortizacao_valor, venc, 'parcela');
    end loop;
  end if;

  insert into movimentacoes_financeiras (empresa_id, tipo, categoria, valor, descricao, created_by)
  select new.empresa_id, 'saida', 'Empréstimo concedido', new.valor_emprestado, 'Contrato ' || new.id, new.created_by
  where new.importado = false;

  return new;
end;
$$;

create trigger trg_gerar_parcelas
  after insert on contratos
  for each row execute function gerar_parcelas();

-- ============================================================
-- FUNÇÃO: registrar pagamento de uma parcela (1 toque no app)
-- Atualiza parcela, cria o registro em pagamentos e recalcula
-- o status do contrato (ativo / atrasado / quitado).
-- ============================================================
create or replace function registrar_pagamento_parcela(
  p_parcela_id uuid,
  p_valor numeric,
  p_forma_pagamento text,
  p_usuario_id uuid,
  p_comprovante_url text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_empresa_id uuid;
  v_contrato_id uuid;
  v_valor_parcela numeric;
  v_valor_pago_total numeric;
  v_parcelas_pendentes int;
  v_parcelas_atrasadas int;
begin
  select empresa_id, contrato_id, valor, coalesce(valor_pago, 0) + p_valor
    into v_empresa_id, v_contrato_id, v_valor_parcela, v_valor_pago_total
  from parcelas where id = p_parcela_id;

  insert into pagamentos (empresa_id, parcela_id, valor, forma_pagamento, comprovante_url, registrado_por)
  values (v_empresa_id, p_parcela_id, p_valor, p_forma_pagamento, p_comprovante_url, p_usuario_id);

  insert into movimentacoes_financeiras (empresa_id, tipo, categoria, valor, descricao, created_by)
  values (v_empresa_id, 'entrada', 'Pagamento de parcela', p_valor, p_forma_pagamento, p_usuario_id);

  update parcelas
  set valor_pago = v_valor_pago_total,
      status = case when v_valor_pago_total >= valor then 'pago' else 'parcial' end,
      data_pagamento = case when v_valor_pago_total >= valor then current_date else data_pagamento end
  where id = p_parcela_id;

  select count(*) filter (where status <> 'pago'),
         count(*) filter (where status <> 'pago' and data_vencimento < current_date)
    into v_parcelas_pendentes, v_parcelas_atrasadas
  from parcelas where contrato_id = v_contrato_id;

  update contratos
  set status = case
    when v_parcelas_pendentes = 0 then 'quitado'
    when v_parcelas_atrasadas > 0 then 'atrasado'
    else 'ativo'
  end
  where id = v_contrato_id;
end;
$$;

-- ============================================================
-- FUNÇÃO: marcar parcelas vencidas como atrasadas (rodar 1x/dia via cron)
-- ============================================================
create or replace function marcar_parcelas_atrasadas()
returns void
language sql
as $$
  update parcelas
  set status = 'atrasado'
  where status = 'a_vencer' and data_vencimento < current_date;
$$;

-- ============================================================
-- FUNÇÃO: cadastrar empréstimo que já estava em andamento
-- (para quem já tem operação rodando antes de usar o app).
-- Aplica o valor já recebido nas parcelas mais antigas, sem
-- criar movimentação no caixa (esse dinheiro já entrou/saiu no passado).
-- ============================================================
create or replace function importar_contrato_existente(
  p_empresa_id uuid,
  p_cliente_id uuid,
  p_valor_emprestado numeric,
  p_taxa_juros numeric,
  p_numero_parcelas int,
  p_data_primeiro_vencimento date,
  p_valor_ja_recebido numeric,
  p_usuario_id uuid,
  p_modalidade text default 'parcelas_fixas',
  p_periodicidade text default 'mensal'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_contrato_id uuid;
  v_restante numeric := coalesce(p_valor_ja_recebido, 0);
  v_parcela record;
  v_aplicar numeric;
  v_parcelas_pendentes int;
  v_parcelas_atrasadas int;
begin
  insert into contratos (
    empresa_id, cliente_id, valor_emprestado, taxa_juros, numero_parcelas,
    data_primeiro_vencimento, modalidade, periodicidade, importado, created_by
  )
  values (
    p_empresa_id, p_cliente_id, p_valor_emprestado, p_taxa_juros, p_numero_parcelas,
    p_data_primeiro_vencimento, p_modalidade, p_periodicidade, true, p_usuario_id
  )
  returning id into v_contrato_id;
  -- o trigger trg_gerar_parcelas já criou as parcelas (sem mexer no caixa, pois importado = true)

  for v_parcela in
    select id, valor from parcelas where contrato_id = v_contrato_id order by numero
  loop
    exit when v_restante <= 0;
    v_aplicar := least(v_parcela.valor, v_restante);

    insert into pagamentos (empresa_id, parcela_id, valor, forma_pagamento, registrado_por)
    values (p_empresa_id, v_parcela.id, v_aplicar, 'Histórico (importado)', p_usuario_id);

    update parcelas
    set valor_pago = v_aplicar,
        status = case when v_aplicar >= valor then 'pago' else 'parcial' end,
        data_pagamento = case when v_aplicar >= valor then current_date else null end
    where id = v_parcela.id;

    v_restante := v_restante - v_aplicar;
  end loop;

  select count(*) filter (where status <> 'pago'),
         count(*) filter (where status <> 'pago' and data_vencimento < current_date)
    into v_parcelas_pendentes, v_parcelas_atrasadas
  from parcelas where contrato_id = v_contrato_id;

  update contratos
  set status = case
    when v_parcelas_pendentes = 0 then 'quitado'
    when v_parcelas_atrasadas > 0 then 'atrasado'
    else 'ativo'
  end
  where id = v_contrato_id;

  return v_contrato_id;
end;
$$;

-- ============================================================
-- MIGRAÇÃO: rodar só isso se você já executou este arquivo antes
-- (adiciona suporte a empréstimos importados / já em andamento)
-- ============================================================
-- alter table contratos add column if not exists importado boolean not null default false;

-- ============================================================
-- MIGRAÇÃO: rodar só isso se você já executou este arquivo antes
-- (adiciona suporte a mais de um modelo de empréstimo)
-- ============================================================
-- alter table contratos add column if not exists modalidade text not null default 'parcelas_fixas';
-- alter table contratos add column if not exists periodicidade text not null default 'mensal';
-- alter table parcelas add column if not exists valor_juros numeric(12,2);
-- alter table parcelas add column if not exists valor_principal numeric(12,2);
-- alter table parcelas add column if not exists tipo text not null default 'parcela';
