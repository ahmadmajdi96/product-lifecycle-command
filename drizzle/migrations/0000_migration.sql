create type public.app_role as enum ('admin', 'engineer', 'quality', 'manufacturing', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  job_title text,
  department text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.can_write(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.user_id = _user_id and p.is_active and r.role in ('admin','engineer','quality','manufacturing')
  )
$$;

create policy "Profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update any profile" on public.profiles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Roles readable by signed-in users" on public.user_roles for select to authenticated using (true);
create policy "Admins grant roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins revoke roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active is distinct from old.is_active and auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only administrators can activate or deactivate accounts';
  end if;
  if new.email is distinct from old.email and auth.uid() is not null then
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger guard_profile_update before update on public.profiles for each row execute function public.guard_profile_update();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.items (
  id text primary key default gen_random_uuid()::text,
  number text not null unique,
  name text not null,
  type text not null,
  uom text not null default 'EA',
  rev text not null default 'A',
  status text not null default 'DRAFT',
  effective_from date not null default current_date,
  effective_to date,
  owner text,
  cost numeric not null default 0,
  ctq text,
  updated_at timestamptz not null default now()
);
create table public.boms (
  id text primary key default gen_random_uuid()::text,
  root text not null, kind text not null, rev text not null, status text not null default 'DRAFT',
  lines jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now()
);
create table public.routings (
  id text primary key default gen_random_uuid()::text,
  number text not null, item text not null, kind text not null, rev text not null, status text not null default 'DRAFT',
  ops jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now()
);
create table public.changes (
  id text primary key default gen_random_uuid()::text,
  number text not null unique, kind text not null, title text not null, category text, problem text, solution text,
  affected jsonb not null default '[]'::jsonb, status text not null, disposition text not null, priority text not null,
  origin text, created_at date not null default current_date, approvals jsonb not null default '[]'::jsonb, parent text,
  updated_at timestamptz not null default now()
);
create table public.docs (
  id text primary key default gen_random_uuid()::text,
  number text not null unique, title text not null, kind text not null, rev text not null default 'A', status text not null default 'DRAFT',
  linked_item text, checked_out_by text, size_kb integer not null default 0, updated_at date not null default current_date
);
create table public.audit (
  id text primary key default gen_random_uuid()::text,
  at timestamptz not null default now(),
  actor text not null,
  actor_id uuid default auth.uid(),
  action text not null, entity text not null, detail text, signature text
);
create table public.syncs (
  id text primary key default gen_random_uuid()::text,
  target text not null, payload text not null, entity text not null, status text not null, at timestamptz not null default now()
);
create table public.work_orders (
  id text primary key, wo text not null, item text not null, qty integer not null, done integer not null default 0, line text
);
create table public.work_centers (
  id text primary key, code text not null, name text not null, area text, capacity_hrs numeric, status text not null default 'AVAILABLE'
);
create table public.inventory (
  id text primary key, on_hand numeric not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['items','boms','routings','changes','docs','syncs','work_orders','work_centers','inventory'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Read %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "Write %1$s" on public.%1$I for insert to authenticated with check (public.can_write(auth.uid()))', t);
    execute format('create policy "Update %1$s" on public.%1$I for update to authenticated using (public.can_write(auth.uid()))', t);
    execute format('create policy "Delete %1$s" on public.%1$I for delete to authenticated using (public.can_write(auth.uid()))', t);
  end loop;
end $$;

grant select, insert on public.audit to authenticated;
grant all on public.audit to service_role;
alter table public.audit enable row level security;
create policy "Read audit" on public.audit for select to authenticated using (true);
create policy "Append own audit entries" on public.audit for insert to authenticated with check (actor_id = auth.uid());

insert into public.items (id, number, name, type, uom, rev, status, effective_from, owner, cost, ctq, effective_to) values
('i1', 'FG-1000', 'Hydraulic Pump Assembly HP-40', 'FG', 'EA', 'C', 'EFFECTIVE', '2026-01-01', 'M. Haddad', 842.5, 'Flow 40 L/min ±2%', null),
('i2', 'FG-1100', 'Hydraulic Pump Assembly HP-60', 'FG', 'EA', 'A', 'APPROVED', '2026-11-05', 'M. Haddad', 1120, null, null),
('i3', 'WIP-2100', 'Pump Housing, Machined', 'WIP', 'EA', 'D', 'EFFECTIVE', '2026-03-14', 'R. Okafor', 214, 'Bore Ø52.000 +0.015/-0', null),
('i4', 'WIP-2200', 'Rotor Sub-Assembly', 'WIP', 'EA', 'B', 'EFFECTIVE', '2026-02-01', 'R. Okafor', 166, null, null),
('i5', 'WIP-2300', 'Shaft, Ground', 'WIP', 'EA', 'A', 'UNDER_REVIEW', '2026-11-20', 'R. Okafor', 58, null, null),
('i6', 'RM-3001', 'Aluminum Billet 6061-T6 Ø80', 'RAW', 'KG', 'A', 'EFFECTIVE', '2025-06-01', 'S. Ibrahim', 4.2, null, null),
('i7', 'RM-3002', 'Steel Bar 4140 Ø25', 'RAW', 'KG', 'B', 'EFFECTIVE', '2025-09-10', 'S. Ibrahim', 2.85, null, null),
('i8', 'RM-3003', 'Viton O-Ring 52x3', 'RAW', 'EA', 'A', 'EFFECTIVE', '2025-01-01', 'S. Ibrahim', 0.65, null, null),
('i9', 'RM-3004', 'Socket Head Cap Screw M6x20', 'RAW', 'EA', 'A', 'EFFECTIVE', '2025-01-01', 'S. Ibrahim', 0.08, null, null),
('i10', 'RM-3005', 'Nitrile O-Ring 52x3 (legacy)', 'RAW', 'EA', 'A', 'OBSOLETE', '2023-01-01', 'S. Ibrahim', 0.4, null, '2025-01-01'),
('i11', 'PKG-4001', 'Corrugated Carton 400x300x250', 'PKG', 'EA', 'B', 'EFFECTIVE', '2026-01-01', 'L. Chen', 1.9, null, null),
('i12', 'TL-5001', 'Housing Fixture FX-210', 'TOOL', 'EA', 'C', 'EFFECTIVE', '2026-03-14', 'R. Okafor', 6400, null, null),
('i13', 'TL-5002', 'Bore Gauge Ø52 Go/No-Go', 'TOOL', 'EA', 'A', 'DRAFT', '2026-12-01', 'L. Chen', 780, null, null);
insert into public.boms (id, root, kind, rev, status, lines) values
('b1', 'FG-1000', 'EBOM', 'A', 'OBSOLETE', '[{"id":"a1","parent":"FG-1000","child":"WIP-2100","qty":1,"scrap":0,"find":10},{"id":"a2","parent":"FG-1000","child":"WIP-2200","qty":1,"scrap":0,"find":20},{"id":"a3","parent":"FG-1000","child":"RM-3005","qty":2,"scrap":2,"find":30},{"id":"a4","parent":"FG-1000","child":"RM-3004","qty":6,"scrap":1,"find":40},{"id":"a5","parent":"WIP-2100","child":"RM-3001","qty":1.8,"scrap":8,"find":10},{"id":"a6","parent":"WIP-2200","child":"RM-3002","qty":0.9,"scrap":5,"find":10}]'::jsonb),
('b2', 'FG-1000', 'EBOM', 'C', 'EFFECTIVE', '[{"id":"c1","parent":"FG-1000","child":"WIP-2100","qty":1,"scrap":0,"find":10},{"id":"c2","parent":"FG-1000","child":"WIP-2200","qty":1,"scrap":0,"find":20},{"id":"c3","parent":"FG-1000","child":"RM-3003","qty":2,"scrap":1.5,"find":30},{"id":"c4","parent":"FG-1000","child":"RM-3004","qty":8,"scrap":1,"find":40},{"id":"c5","parent":"WIP-2100","child":"RM-3001","qty":1.65,"scrap":6,"find":10},{"id":"c6","parent":"WIP-2200","child":"RM-3002","qty":0.9,"scrap":5,"find":10},{"id":"c7","parent":"WIP-2200","child":"WIP-2300","qty":1,"scrap":0,"find":20}]'::jsonb),
('b3', 'FG-1000', 'MBOM', 'C', 'EFFECTIVE', '[{"id":"mc1","parent":"FG-1000","child":"WIP-2100","qty":1,"scrap":0,"find":10},{"id":"mc2","parent":"FG-1000","child":"WIP-2200","qty":1,"scrap":0,"find":20},{"id":"mc3","parent":"FG-1000","child":"RM-3003","qty":2,"scrap":1.5,"find":30},{"id":"mc4","parent":"FG-1000","child":"RM-3004","qty":8,"scrap":1,"find":40},{"id":"mc5","parent":"WIP-2100","child":"RM-3001","qty":1.65,"scrap":6,"find":10},{"id":"mc6","parent":"WIP-2200","child":"RM-3002","qty":0.9,"scrap":5,"find":10},{"id":"mc7","parent":"WIP-2200","child":"WIP-2300","qty":1,"scrap":0,"find":20},{"id":"m8","parent":"FG-1000","child":"PKG-4001","qty":1,"scrap":0.5,"find":90}]'::jsonb);
insert into public.routings (id, number, item, kind, rev, status, ops) values
('r1', 'RT-1000-STD', 'FG-1000', 'STANDARD', 'C', 'EFFECTIVE', '[{"seq":10,"name":"Machine housing bore","workCenter":"WC-CNC-01","setupMin":45,"cycleSec":420,"sop":"SOP-110"},{"seq":20,"name":"Deburr & wash","workCenter":"WC-CNC-02","setupMin":10,"cycleSec":90,"sop":"WI-120"},{"seq":30,"name":"Install rotor & seals","workCenter":"WC-ASSY-01","setupMin":15,"cycleSec":300,"sop":"WI-130"},{"seq":40,"name":"Hydrostatic flow test","workCenter":"WC-TEST-01","setupMin":20,"cycleSec":240,"sop":"SOP-140"},{"seq":50,"name":"Pack & label","workCenter":"WC-PACK-01","setupMin":5,"cycleSec":60}]'::jsonb),
('r2', 'RT-1000-RWK', 'FG-1000', 'REWORK', 'A', 'EFFECTIVE', '[{"seq":10,"name":"Teardown & inspect seals","workCenter":"WC-ASSY-02","setupMin":5,"cycleSec":180,"sop":"WI-210"},{"seq":20,"name":"Re-test flow","workCenter":"WC-TEST-01","setupMin":10,"cycleSec":240,"sop":"SOP-140"}]'::jsonb);
insert into public.changes (id, number, kind, title, category, problem, solution, affected, status, disposition, priority, origin, created_at, approvals, parent) values
('c1', 'ECR-2026-0041', 'ECR', 'Replace nitrile O-ring with Viton for thermal stability', 'Quality Fix', 'NCR-8812: seal hardening above 110°C observed on returned units.', 'Substitute RM-3005 with RM-3003 Viton 52x3.', '["FG-1000","RM-3005","RM-3003"]'::jsonb, 'RELEASED', 'USE_AS_IS', 'HIGH', 'CORTA QC · NCR-8812', '2026-09-02', '[{"role":"Lead Design Authority","user":"M. Haddad","decision":"APPROVED","at":"2026-10-27T10:10:00Z","meaning":"Approved — reviewed and accept"},{"role":"Manufacturing Engineering Lead","user":"R. Okafor","decision":"APPROVED","at":"2026-10-27T10:11:00Z","meaning":"Approved — reviewed and accept"},{"role":"Quality Assurance Lead","user":"L. Chen","decision":"APPROVED","at":"2026-10-27T10:12:00Z","meaning":"Approved — reviewed and accept"},{"role":"Operations / Supply Chain Lead","user":"S. Ibrahim","decision":"APPROVED","at":"2026-10-27T10:13:00Z","meaning":"Approved — reviewed and accept"}]'::jsonb, null),
('c2', 'ECR-2026-0057', 'ECR', 'Reduce billet stock allowance on pump housing', 'Cost Reduction', 'Excess billet material removal increases cycle time 18%.', 'Reduce billet length; RM-3001 qty 1.8→1.65 kg.', '["WIP-2100","RM-3001"]'::jsonb, 'IN_REVIEW', 'RUN_OUT', 'MEDIUM', 'MES Command Center · Issue log', '2026-10-20', '[{"role":"Lead Design Authority","user":"M. Haddad","decision":"APPROVED","at":"2026-10-27T10:10:00Z","meaning":"Approved — reviewed and accept"},{"role":"Manufacturing Engineering Lead","user":"R. Okafor","decision":"APPROVED","at":"2026-10-27T10:11:00Z","meaning":"Approved — reviewed and accept"},{"role":"Quality Assurance Lead","user":"L. Chen","decision":"PENDING"},{"role":"Operations / Supply Chain Lead","user":"S. Ibrahim","decision":"PENDING"}]'::jsonb, null),
('c3', 'ECO-2026-0033', 'ECO', 'Implement HP-40 Rev D: ground shaft sub-assembly', 'Design Improvement', 'Shaft runout causes vibration at 3000 rpm.', 'Introduce WIP-2300 ground shaft into rotor sub-assembly.', '["WIP-2200","WIP-2300","FG-1000"]'::jsonb, 'IN_REVIEW', 'REWORK', 'CRITICAL', 'Engineering', '2026-10-24', '[{"role":"Lead Design Authority","user":"M. Haddad","decision":"APPROVED","at":"2026-10-27T10:10:00Z","meaning":"Approved — reviewed and accept"},{"role":"Manufacturing Engineering Lead","user":"R. Okafor","decision":"PENDING"},{"role":"Quality Assurance Lead","user":"L. Chen","decision":"PENDING"},{"role":"Operations / Supply Chain Lead","user":"S. Ibrahim","decision":"PENDING"}]'::jsonb, 'ECR-2026-0049'),
('c4', 'ECN-2026-0029', 'ECN', 'Notice: HP-40 Rev C effective release', 'Quality Fix', 'Broadcast of ECO-2026-0028 outcomes.', 'Provision Rev C EBOM/MBOM/Routing to MOS.', '["FG-1000"]'::jsonb, 'RELEASED', 'USE_AS_IS', 'MEDIUM', 'ECO-2026-0028', '2026-09-30', '[{"role":"Lead Design Authority","user":"M. Haddad","decision":"APPROVED","at":"2026-10-27T10:10:00Z","meaning":"Approved — reviewed and accept"},{"role":"Manufacturing Engineering Lead","user":"R. Okafor","decision":"APPROVED","at":"2026-10-27T10:11:00Z","meaning":"Approved — reviewed and accept"},{"role":"Quality Assurance Lead","user":"L. Chen","decision":"APPROVED","at":"2026-10-27T10:12:00Z","meaning":"Approved — reviewed and accept"},{"role":"Operations / Supply Chain Lead","user":"S. Ibrahim","decision":"APPROVED","at":"2026-10-27T10:13:00Z","meaning":"Approved — reviewed and accept"}]'::jsonb, null);
insert into public.docs (id, number, title, kind, rev, status, linked_item, size_kb, updated_at, checked_out_by) values
('d1', 'DWG-1000', 'HP-40 General Assembly Drawing', 'DRAWING', 'C', 'EFFECTIVE', 'FG-1000', 2480, '2026-09-30', null),
('d2', 'CAD-2100', 'Pump Housing 3D Model (STEP)', 'CAD', 'D', 'EFFECTIVE', 'WIP-2100', 18400, '2026-03-14', null),
('d3', 'SOP-110', 'CNC Bore Machining Procedure', 'SOP', 'B', 'EFFECTIVE', 'WIP-2100', 640, '2026-04-02', null),
('d4', 'SOP-140', 'Hydrostatic Flow Test Procedure', 'SOP', 'C', 'EFFECTIVE', 'FG-1000', 820, '2026-08-11', null),
('d5', 'WI-130', 'Rotor & Seal Installation WI', 'WI', 'E', 'UNDER_REVIEW', 'FG-1000', 1210, '2026-10-26', 'R. Okafor'),
('d6', 'SPEC-3003', 'Viton O-Ring Material Specification', 'SPEC', 'A', 'EFFECTIVE', 'RM-3003', 310, '2026-09-02', null),
('d7', 'DWG-2300', 'Ground Shaft Detail Drawing', 'DRAWING', 'A', 'DRAFT', 'WIP-2300', 1100, '2026-10-28', 'M. Haddad');
insert into public.audit (id, at, actor, action, entity, detail, signature) values
('a1', '2026-10-28T14:22:10Z', 'L. Chen', 'E-SIGN', 'ECR-2026-0057', 'Approved as Quality Assurance Lead', 'SHA256:9f2c…a71e'),
('a2', '2026-10-28T09:03:44Z', 'M. Haddad', 'CHECK_OUT', 'DWG-2300', 'Locked for editing', null),
('a3', '2026-10-26T16:40:01Z', 'R. Okafor', 'CHECK_OUT', 'WI-130', 'Locked for editing', null),
('a4', '2026-09-30T00:00:00Z', 'SYSTEM', 'EFFECTIVITY', 'FG-1000 Rev C', 'Rev C → EFFECTIVE, Rev B → PHASED_OUT', null);
insert into public.syncs (id, target, payload, entity, status, at) values
('s1', 'MES Command Center', 'bom.released', 'FG-1000 MBOM Rev C', 'ACK', '2026-09-30T00:00:05Z'),
('s2', 'MES Command Center', 'routing.released', 'RT-1000-STD Rev C', 'ACK', '2026-09-30T00:00:06Z'),
('s3', 'CORTA QC', 'inspection_plan.sync', 'WIP-2100 CTQ Bore Ø52', 'ACK', '2026-09-30T00:00:08Z'),
('s4', 'Unified Command Center', 'tooling.requirement', 'TL-5001 FX-210', 'SENT', '2026-10-27T11:00:00Z');
insert into public.work_orders (id, wo, item, qty, done, line) values
('WO-24-1182', 'WO-24-1182', 'FG-1000', 500, 312, 'LINE-A'),
('WO-24-1190', 'WO-24-1190', 'FG-1000', 250, 40, 'LINE-B'),
('WO-24-1201', 'WO-24-1201', 'WIP-2100', 1200, 880, 'CELL-3'),
('WO-24-1205', 'WO-24-1205', 'WIP-2200', 600, 0, 'CELL-1'),
('WO-24-1211', 'WO-24-1211', 'FG-1100', 300, 120, 'LINE-A');
insert into public.inventory (id, on_hand) values
('RM-3001', 4200), ('RM-3002', 1800), ('RM-3003', 950), ('RM-3004', 12000),
('WIP-2100', 340), ('WIP-2200', 120), ('PKG-4001', 2600), ('FG-1000', 180);
insert into public.work_centers (id, code, name, area, capacity_hrs, status) values
('WC-CNC-01', 'WC-CNC-01', '5-Axis CNC Mill #1', 'CNC', 16, 'AVAILABLE'),
('WC-CNC-02', 'WC-CNC-02', 'CNC Lathe & Deburr', 'CNC', 16, 'AVAILABLE'),
('WC-WELD-01', 'WC-WELD-01', 'Robotic Weld Cell', 'WELD', 8, 'AVAILABLE'),
('WC-PAINT-01', 'WC-PAINT-01', 'Powder Coat Line', 'PAINT', 8, 'MAINTENANCE'),
('WC-ASSY-01', 'WC-ASSY-01', 'Pump Assembly Bench A', 'ASSY', 16, 'AVAILABLE'),
('WC-ASSY-02', 'WC-ASSY-02', 'Rework / Teardown Bench', 'ASSY', 8, 'AVAILABLE'),
('WC-TEST-01', 'WC-TEST-01', 'Hydrostatic Test Stand', 'TEST', 16, 'AVAILABLE'),
('WC-PACK-01', 'WC-PACK-01', 'Pack & Label Station', 'PACK', 16, 'AVAILABLE');