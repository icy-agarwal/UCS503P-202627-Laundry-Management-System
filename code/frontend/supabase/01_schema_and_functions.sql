-- =====================================================================================
-- Hostel Laundry: staff + admin + complaints + pickup (run ONCE in Supabase -> SQL Editor)
-- Safe to re-run. It only ADDS columns/tables/functions; it never deletes your data.
-- It also replaces register_student and get_student_profile with versions that read the
-- hostel code/gender from the hostels table (same inputs and outputs as before).
-- =====================================================================================
begin;

-- ---------- 0. make sure id counters are ahead of any rows you inserted by hand ----------
do $$ declare t text; c text; q text; begin
  for t, c in select * from (values ('hostels','hostel_id'),('clothing_categories','category_id'),('students','student_id'),('staff','staff_id'),
      ('student_assignments','assignment_id'),('laundry_requests','laundry_id'),('laundry_items','item_id'),('laundry_batches','batch_id'),
      ('complaints','complaint_id'),('notifications','notification_id'),('audit_logs','audit_id'),('semesters','semester_id')) v(t, c) loop
    q := pg_get_serial_sequence('public.' || t, c);
    if q is not null then execute format('select setval(%L, coalesce((select max(%I) from public.%I), 0) + 1, false)', q, c, t); end if;
  end loop;
end $$;

-- ---------- 1. new columns ----------------------------------------------------------
alter table public.hostels
  add column if not exists code text, add column if not exists gender text,
  add column if not exists collection_day smallint, add column if not exists delivery_day smallint,
  add column if not exists is_active boolean not null default true;

update public.hostels set hostel_name = 'Ananta Hall (N)' where hostel_name = 'Ananta Hall';
update public.hostels set code = case
    when hostel_name ~ '\(([A-Za-z0-9-]+)\)' then upper(replace((regexp_match(hostel_name, '\(([A-Za-z0-9-]+)\)'))[1], '-', ''))
    else upper(regexp_replace(hostel_name, '^Hostel\s+', '')) end
  where code is null;
update public.hostels set gender = case
    when code in ('A','B','C','D','H','J','K','L','M','O') then 'Boys'
    when code in ('E','G','I','N','Q','PG','PG2') then 'Girls' end
  where gender is null;
update public.hostels h set collection_day = v.c, delivery_day = v.d
  from (values ('B',1,5),('H',1,5),('O',1,5),('I',1,5),('Q',1,5),('A',2,6),('D',2,6),('J',2,6),('E',2,6),('G',2,6),('N',2,6),
               ('C',3,6),('K',3,6),('L',3,6),('M',3,6),('PG',3,6),('PG2',3,6)) as v(code, c, d)
  where h.code = v.code and h.collection_day is null;
update public.hostels set is_active = false where gender is null;   -- e.g. "Hostel FRG": not offered to students
create unique index if not exists hostels_code_key on public.hostels (code);

alter table public.students add column if not exists is_active boolean not null default true;

alter table public.staff
  add column if not exists auth_user_id uuid, add column if not exists is_active boolean not null default true,
  add column if not exists hostel_id integer references public.hostels (hostel_id);
create unique index if not exists staff_auth_user_key on public.staff (auth_user_id);
create unique index if not exists staff_phone_key on public.staff (phone);
create unique index if not exists staff_email_lower_key on public.staff (lower(email));

alter table public.clothing_categories add column if not exists is_active boolean not null default true;

alter table public.laundry_requests
  add column if not exists rejected_reason text, add column if not exists verified_at timestamp, add column if not exists returned_at timestamp;

alter table public.laundry_batches add column if not exists pickup_code varchar(6);
create unique index if not exists laundry_batches_laundry_key on public.laundry_batches (laundry_id);

alter table public.complaints
  add column if not exists complaint_type text, add column if not exists escalated boolean not null default false,
  add column if not exists updated_at timestamp;

alter table public.audit_logs add column if not exists actor_name text, add column if not exists actor_role text;
alter table public.audit_logs alter column staff_id drop not null;
alter table public.audit_logs alter column laundry_id drop not null;

-- laundry_items.quantity may be 0 once staff correct a count; complaint status gets two more steps
do $$ declare r record; begin
  for r in select conname from pg_constraint where conrelid = 'public.laundry_items'::regclass and contype = 'c'
           and pg_get_constraintdef(oid) ilike '%quantity > 0%' loop
    execute format('alter table public.laundry_items drop constraint %I', r.conname);
  end loop;
  for r in select conname from pg_constraint where conrelid = 'public.complaints'::regclass and contype = 'c'
           and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.complaints drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.laundry_items drop constraint if exists laundry_items_quantity_nonneg;
alter table public.laundry_items add constraint laundry_items_quantity_nonneg check (quantity >= 0);
alter table public.complaints drop constraint if exists complaints_status_check2;
alter table public.complaints add constraint complaints_status_check2
  check (status in ('OPEN','UNDER_REVIEW','INVESTIGATING','IN_PROGRESS','RESOLVED','CLOSED'));

-- ---------- 2. new tables (locked: no policies, only the functions below can touch them) ----
create table if not exists public.laundry_item_conditions (
  condition_id serial primary key,
  laundry_id integer not null references public.laundry_requests (laundry_id) on delete cascade,
  category_id integer not null references public.clothing_categories (category_id),
  condition_name text not null, created_at timestamp not null default now());
create table if not exists public.condition_options (
  option_id serial primary key, name text not null unique, is_active boolean not null default true);
create table if not exists public.complaint_notes (
  note_id serial primary key,
  complaint_id integer not null references public.complaints (complaint_id) on delete cascade,
  author_name text not null, author_role text not null, note text not null, created_at timestamp not null default now());
create table if not exists public.app_settings (key text primary key, value text not null);
alter table public.laundry_item_conditions enable row level security;
alter table public.condition_options enable row level security;
alter table public.complaint_notes enable row level security;
alter table public.app_settings enable row level security;
insert into public.condition_options (name) values ('Small tear'),('Faded color'),('Stain'),('Missing button'),('Other damage') on conflict (name) do nothing;
insert into public.app_settings (key, value) values ('enforce_counter_hours', 'true') on conflict (key) do nothing;

-- ---------- 3. private helpers (not reachable from the app) ----------------------------
create schema if not exists app_private;

create or replace function app_private.ts(p timestamp) returns text language sql immutable set search_path = '' as
$$ select case when p is null then null else to_char(p, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end $$;

create or replace function app_private.caller() returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; st record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into s from public.staff where auth_user_id = auth.uid();
  if s.staff_id is null then   -- first login of a staff/admin: link the verified email to the staff row
    update public.staff set auth_user_id = auth.uid()
     where auth_user_id is null and lower(email) = lower(auth.jwt() ->> 'email')
       and exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null);
    select * into s from public.staff where auth_user_id = auth.uid();
  end if;
  if s.staff_id is not null then
    if not s.is_active then raise exception 'This account has been deactivated.'; end if;
    return jsonb_build_object('role', lower(s.role), 'staff_id', s.staff_id, 'hostel_id', s.hostel_id, 'name', s.name);
  end if;
  select * into st from public.students where auth_user_id = auth.uid();
  if st.student_id is not null and not st.is_active then raise exception 'This account has been deactivated.'; end if;
  return jsonb_build_object('role', 'student', 'student_id', st.student_id, 'name', st.name);
end $$;

create or replace function app_private.need(p_roles text[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.caller();
begin
  if not ((c ->> 'role') = any (p_roles)) then raise exception 'You do not have permission to do this.'; end if;
  return c;
end $$;

create or replace function app_private.can_see(c jsonb, p_id integer) returns boolean language sql stable security definer set search_path = '' as $$
  select case c ->> 'role'
    when 'admin' then exists (select 1 from public.laundry_requests where laundry_id = p_id)
    when 'staff' then exists (select 1 from public.laundry_requests lr join public.student_assignments sa on sa.assignment_id = lr.assignment_id
                              where lr.laundry_id = p_id and sa.hostel_id = (c ->> 'hostel_id')::int)
    else exists (select 1 from public.laundry_requests lr where lr.laundry_id = p_id and lr.student_id = (c ->> 'student_id')::int) end $$;

create or replace function app_private.audit(c jsonb, p_laundry integer, p_action text, p_prev text, p_new text) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (staff_id, laundry_id, action, previous_value, new_value, actor_name, actor_role)
  values (nullif(c ->> 'staff_id', '')::int, p_laundry, p_action, p_prev, p_new, c ->> 'name', c ->> 'role') $$;

create or replace function app_private.notify(p_student integer, p_title text, p_msg text) returns void
language sql security definer set search_path = '' as
$$ insert into public.notifications (student_id, title, message) values (p_student, p_title, p_msg) $$;

create or replace function app_private.next_delivery(p_hostel integer) returns timestamp language sql stable security definer set search_path = '' as $$
  select ((now() at time zone 'Asia/Kolkata')::date
          + coalesce(nullif((h.delivery_day - extract(dow from (now() at time zone 'Asia/Kolkata'))::int + 7) % 7, 0), 7))::timestamp
  from public.hostels h where h.hostel_id = p_hostel and h.delivery_day is not null $$;

create or replace function app_private.check_counter(p_hostel integer) returns void language plpgsql security definer set search_path = '' as $$
declare h record; n timestamp := now() at time zone 'Asia/Kolkata'; d int; m int;
begin
  if coalesce((select value from public.app_settings where key = 'enforce_counter_hours'), 'true') <> 'true' then return; end if;
  select * into h from public.hostels where hostel_id = p_hostel;
  if h.collection_day is null then return; end if;
  d := extract(dow from n)::int; m := extract(hour from n)::int * 60 + extract(minute from n)::int;
  if d <> h.collection_day and d <> h.delivery_day then raise exception 'The laundry counter is closed today for your hostel.'; end if;
  if not ((m >= 750 and m < 900) or (m >= 960 and m < 1140)) then
    raise exception 'The laundry counter is closed right now. Hours are 12:30-3:00 PM and 4:00-7:00 PM.'; end if;
end $$;

create or replace function app_private.request_json(p_id integer) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', lr.laundry_id, 'status', lr.status,
    'submitted_at', app_private.ts(lr.submitted_at), 'expected_completion', app_private.ts(lr.expected_completion),
    'collected_at', app_private.ts(lr.collected_at), 'returned_at', app_private.ts(lr.returned_at),
    'remarks', lr.remarks, 'rejected_reason', lr.rejected_reason, 'tag_code', lb.tag_code,
    'student_id', s.student_id, 'roll', upper(split_part(split_part(s.college_email, '@', 1), '.', 1)), 'student_name', s.name,
    'hostel_code', h.code, 'room', sa.room_number,
    'late', (lr.status = 'IN_LAUNDRY' and lr.expected_completion is not null and lr.expected_completion < now()),
    'token_used', (lb.pickup_token_used_at is not null),
    'token_active', (lr.status = 'READY_FOR_PICKUP' and lb.pickup_code is not null and lb.pickup_token_used_at is null),
    'items', coalesce((select jsonb_object_agg(cc.category_name, coalesce(li.verified_quantity, li.quantity))
                       from public.laundry_items li join public.clothing_categories cc on cc.category_id = li.category_id
                       where li.laundry_id = lr.laundry_id and coalesce(li.verified_quantity, li.quantity) > 0), '{}'::jsonb),
    'original', coalesce((select jsonb_object_agg(cc.category_name, li.quantity)
                          from public.laundry_items li join public.clothing_categories cc on cc.category_id = li.category_id
                          where li.laundry_id = lr.laundry_id and li.quantity > 0), '{}'::jsonb),
    'conditions', coalesce((select jsonb_agg(jsonb_build_object('c', cc.category_name, 'k', ic.condition_name) order by ic.condition_id)
                            from public.laundry_item_conditions ic join public.clothing_categories cc on cc.category_id = ic.category_id
                            where ic.laundry_id = lr.laundry_id), '[]'::jsonb),
    'complaint_id', (select max(c.complaint_id) from public.complaints c where c.laundry_id = lr.laundry_id),
    'log', coalesce((select jsonb_agg(jsonb_build_object('t', app_private.ts(a.created_at), 'who', coalesce(a.actor_name, 'Staff'),
                                                          'role', a.actor_role, 'a', a.action, 'from', a.previous_value, 'to', a.new_value)
                                      order by a.created_at, a.audit_id)
                     from public.audit_logs a where a.laundry_id = lr.laundry_id), '[]'::jsonb))
  from public.laundry_requests lr
  join public.students s on s.student_id = lr.student_id
  left join public.student_assignments sa on sa.assignment_id = lr.assignment_id
  left join public.hostels h on h.hostel_id = sa.hostel_id
  left join public.laundry_batches lb on lb.laundry_id = lr.laundry_id
  where lr.laundry_id = p_id $$;

create or replace function app_private.complaint_json(p_id integer) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.complaint_id, 'laundry_id', c.laundry_id, 'batch', coalesce(lb.tag_code, 'LR-' || c.laundry_id),
    'roll', upper(split_part(split_part(s.college_email, '@', 1), '.', 1)), 'student_name', s.name, 'hostel_code', h.code,
    'type', coalesce(c.complaint_type, c.subject), 'status', c.status, 'escalated', c.escalated,
    'filed_at', app_private.ts(c.created_at), 'description', c.description,
    'notes', coalesce((select jsonb_agg(jsonb_build_object('t', app_private.ts(n.created_at), 'who', n.author_name, 'role', n.author_role, 'a', n.note)
                                        order by n.created_at, n.note_id)
                       from public.complaint_notes n where n.complaint_id = c.complaint_id), '[]'::jsonb))
  from public.complaints c
  join public.students s on s.student_id = c.student_id
  left join public.laundry_requests lr on lr.laundry_id = c.laundry_id
  left join public.student_assignments sa on sa.assignment_id = lr.assignment_id
  left join public.hostels h on h.hostel_id = sa.hostel_id
  left join public.laundry_batches lb on lb.laundry_id = c.laundry_id
  where c.complaint_id = p_id $$;

create or replace function app_private.can_see_complaint(c jsonb, p_id integer) returns boolean language sql stable security definer set search_path = '' as $$
  select case c ->> 'role'
    when 'admin' then exists (select 1 from public.complaints where complaint_id = p_id)
    when 'staff' then exists (select 1 from public.complaints cm join public.laundry_requests lr on lr.laundry_id = cm.laundry_id
                              join public.student_assignments sa on sa.assignment_id = lr.assignment_id
                              where cm.complaint_id = p_id and sa.hostel_id = (c ->> 'hostel_id')::int)
    else exists (select 1 from public.complaints where complaint_id = p_id and student_id = (c ->> 'student_id')::int) end $$;

-- ---------- 4. functions the app calls: everyone -------------------------------------
create or replace function public.get_my_role() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.caller(); h record;
begin
  if c ->> 'role' = 'staff' then
    select code, hostel_name into h from public.hostels where hostel_id = (c ->> 'hostel_id')::int;
    c := c || jsonb_build_object('hostel_code', h.code, 'hostel_name', h.hostel_name);
  end if;
  return c || jsonb_build_object('email', lower(auth.jwt() ->> 'email'));
end $$;

create or replace function public.staff_login_email(p_phone text) returns text language sql stable security definer set search_path = '' as $$
  select lower(email) from public.staff
  where is_active and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10
  limit 1 $$;

create or replace function public.get_app_config() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.caller();
  return jsonb_build_object(
    'hostels', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'name', hostel_name, 'gender', gender, 'collection_day', collection_day, 'delivery_day', delivery_day) order by hostel_id)
                         from public.hostels where is_active), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', category_id, 'name', category_name, 'on', is_active) order by category_id) from public.clothing_categories), '[]'::jsonb),
    'conditions', coalesce((select jsonb_agg(name order by option_id) from public.condition_options where is_active), '[]'::jsonb),
    'semesters', coalesce((select jsonb_agg(jsonb_build_object('id', semester_id, 'name', semester_name, 'cohort_year', cohort_year, 'active', is_active) order by semester_id) from public.semesters), '[]'::jsonb),
    'enforce_counter_hours', coalesce((select value from public.app_settings where key = 'enforce_counter_hours'), 'true') = 'true');
end $$;

create or replace function public.list_requests() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.caller();
begin
  return coalesce((select jsonb_agg(app_private.request_json(lr.laundry_id) order by lr.submitted_at desc, lr.laundry_id desc)
                   from public.laundry_requests lr where app_private.can_see(c, lr.laundry_id)), '[]'::jsonb);
end $$;

create or replace function public.get_request(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.caller();
begin
  if not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  return app_private.request_json(p_id);
end $$;

create or replace function public.list_complaints() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.caller();
begin
  return coalesce((select jsonb_agg(app_private.complaint_json(cm.complaint_id) order by cm.created_at desc, cm.complaint_id desc)
                   from public.complaints cm where app_private.can_see_complaint(c, cm.complaint_id)), '[]'::jsonb);
end $$;

create or replace function public.get_complaint(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.caller();
begin
  if not app_private.can_see_complaint(c, p_id) then raise exception 'Complaint not found.'; end if;
  return app_private.complaint_json(p_id);
end $$;

-- ---------- 5. students -------------------------------------------------------------
create or replace function public.student_submit_request(p_items jsonb, p_remarks text default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['student']); v_hostel int; v_id int;
begin
  if (c ->> 'student_id') is null then raise exception 'Please complete your profile first.'; end if;
  select sa.hostel_id into v_hostel from public.student_assignments sa join public.semesters sem on sem.semester_id = sa.semester_id
   where sa.student_id = (c ->> 'student_id')::int and sem.is_active order by sa.created_at desc limit 1;
  if v_hostel is null then raise exception 'No active hostel assignment found.'; end if;
  perform app_private.check_counter(v_hostel);
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Please select at least one clothing item.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e join public.clothing_categories cc on cc.category_id = (e ->> 'category_id')::int where not cc.is_active) then
    raise exception 'One of the selected categories is no longer accepted.'; end if;
  v_id := public.submit_laundry_request(p_items, p_remarks);
  update public.laundry_requests set expected_completion = app_private.next_delivery(v_hostel) where laundry_id = v_id;
  perform app_private.audit(c, v_id, 'Submitted request', null, 'SUBMITTED');
  perform app_private.notify((c ->> 'student_id')::int, 'Request submitted', 'Request LR-' || v_id || ' is waiting for staff verification');
  return v_id;
end $$;

create or replace function public.student_get_pickup(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['student']); lb record;
begin
  if not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  select * into lb from public.laundry_batches where laundry_id = p_id;
  if lb.pickup_code is null then return null; end if;
  return jsonb_build_object('token', lb.pickup_token::text, 'code', lb.pickup_code, 'used', lb.pickup_token_used_at is not null);
end $$;

create or replace function public.student_create_complaint(p_laundry_id integer, p_type text, p_description text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['student']); v_id int;
begin
  if not app_private.can_see(c, p_laundry_id) then raise exception 'Laundry not found.'; end if;
  if p_type not in ('Missing','Damaged','Wrong item','Incorrect quantity','Delay','Other') then raise exception 'Invalid complaint type.'; end if;
  if p_description is null or trim(p_description) = '' then raise exception 'Please describe the issue.'; end if;
  insert into public.complaints (student_id, laundry_id, subject, complaint_type, description, status)
  values ((c ->> 'student_id')::int, p_laundry_id, p_type, p_type, trim(p_description), 'OPEN') returning complaint_id into v_id;
  perform app_private.audit(c, p_laundry_id, 'Complaint C-' || v_id || ' filed: ' || p_type, null, null);
  perform app_private.notify((c ->> 'student_id')::int, 'Complaint submitted', 'C-' || v_id || ' is linked to your laundry LR-' || p_laundry_id);
  return app_private.complaint_json(v_id);
end $$;

create or replace function public.student_list_notifications() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['student']);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', notification_id, 'title', title, 'body', message, 'at', app_private.ts(created_at), 'read', is_read)
                                    order by created_at desc, notification_id desc)
                   from public.notifications where student_id = (c ->> 'student_id')::int), '[]'::jsonb);
end $$;

create or replace function public.student_mark_notifications_read() returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['student']);
begin update public.notifications set is_read = true where student_id = (c ->> 'student_id')::int; end $$;

-- ---------- 6. staff counter ----------------------------------------------------------
create or replace function public.staff_verify_request(p_id integer, p_items jsonb, p_conditions jsonb default '[]', p_remarks text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); lr record; r record; v_new int; v_old int; v_total int := 0; changes text[] := '{}'; v_hostel int; cond jsonb; v_cat int;
begin
  select * into lr from public.laundry_requests where laundry_id = p_id for update;
  if lr.laundry_id is null or not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  if lr.status not in ('SUBMITTED','WAITING_FOR_VERIFICATION') then raise exception 'This request has already been handled.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'object' then raise exception 'Invalid item counts.'; end if;
  for r in select cc.category_id, cc.category_name from public.clothing_categories cc
           where cc.category_name in (select jsonb_object_keys(p_items))
              or exists (select 1 from public.laundry_items li where li.laundry_id = p_id and li.category_id = cc.category_id) loop
    v_new := coalesce((p_items ->> r.category_name)::int, 0);
    if v_new < 0 then raise exception 'Counts cannot be negative.'; end if;
    select coalesce(sum(quantity), 0) into v_old from public.laundry_items where laundry_id = p_id and category_id = r.category_id;
    if exists (select 1 from public.laundry_items where laundry_id = p_id and category_id = r.category_id) then
      update public.laundry_items set verified_quantity = v_new where laundry_id = p_id and category_id = r.category_id;
    else
      insert into public.laundry_items (laundry_id, category_id, quantity, verified_quantity) values (p_id, r.category_id, 0, v_new);
    end if;
    v_total := v_total + v_new;
    if v_new <> v_old then
      changes := changes || (r.category_name || ' ' || v_old || ' to ' || v_new);
      perform app_private.audit(c, p_id, 'Changed student''s entry at verification', r.category_name || ' ' || v_old, r.category_name || ' ' || v_new);
    end if;
  end loop;
  if v_total = 0 then raise exception 'Approve at least one piece, or reject the request.'; end if;
  delete from public.laundry_item_conditions where laundry_id = p_id;
  for cond in select value from jsonb_array_elements(coalesce(p_conditions, '[]'::jsonb)) loop
    select category_id into v_cat from public.clothing_categories where category_name = cond ->> 'c';
    if v_cat is not null then insert into public.laundry_item_conditions (laundry_id, category_id, condition_name) values (p_id, v_cat, cond ->> 'k'); end if;
  end loop;
  select sa.hostel_id into v_hostel from public.student_assignments sa where sa.assignment_id = lr.assignment_id;
  update public.laundry_requests set status = 'VERIFIED', verified_at = now(), remarks = nullif(trim(coalesce(p_remarks, '')), ''),
         expected_completion = coalesce(expected_completion, app_private.next_delivery(v_hostel)) where laundry_id = p_id;
  perform app_private.audit(c, p_id, case when cardinality(changes) > 0 then 'Verified. Changed ' || array_to_string(changes, ', ') else 'Verified physical count, no changes' end, lr.status, 'VERIFIED');
  perform app_private.notify(lr.student_id, case when cardinality(changes) > 0 then 'Request modified at verification' else 'Verification completed' end,
                             'LR-' || p_id || ' verified: ' || v_total || ' pieces' || case when cardinality(changes) > 0 then ' (count differed from your entry)' else '' end);
  return app_private.request_json(p_id);
end $$;

create or replace function public.staff_reject_request(p_id integer, p_reason text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); lr record;
begin
  select * into lr from public.laundry_requests where laundry_id = p_id for update;
  if lr.laundry_id is null or not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  if lr.status not in ('SUBMITTED','WAITING_FOR_VERIFICATION') then raise exception 'This request has already been handled.'; end if;
  update public.laundry_requests set status = 'CANCELLED', rejected_reason = p_reason where laundry_id = p_id;
  perform app_private.audit(c, p_id, 'Rejected at verification: ' || coalesce(p_reason, ''), lr.status, 'CANCELLED');
  perform app_private.notify(lr.student_id, 'Request rejected', 'LR-' || p_id || ' was rejected: ' || coalesce(p_reason, ''));
  return app_private.request_json(p_id);
end $$;

create or replace function public.staff_generate_batch_id(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); lr record;
begin
  select * into lr from public.laundry_requests where laundry_id = p_id for update;
  if lr.laundry_id is null or not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  if lr.status <> 'VERIFIED' then raise exception 'Verify the request before generating a batch ID.'; end if;
  if not exists (select 1 from public.laundry_batches where laundry_id = p_id) then
    insert into public.laundry_batches (laundry_id, tag_code) values (p_id, 'L-' || p_id);
    perform app_private.audit(c, p_id, 'Generated batch ID L-' || p_id, null, null);
  end if;
  return app_private.request_json(p_id);
end $$;

create or replace function public.staff_set_status(p_ids integer[], p_to text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); v_from text; v_id int; lr record; v_code text; v_msg text; v_out jsonb := '[]'::jsonb;
begin
  v_from := case p_to when 'TAGGED' then 'VERIFIED' when 'IN_LAUNDRY' then 'TAGGED' when 'RETURNED' then 'IN_LAUNDRY' when 'READY_FOR_PICKUP' then 'RETURNED' end;
  if v_from is null then raise exception 'Invalid status.'; end if;
  v_msg := case p_to when 'TAGGED' then 'Tag applied' when 'IN_LAUNDRY' then 'Sent to laundry' when 'RETURNED' then 'Marked returned' else 'Marked ready for pickup. QR activated' end;
  foreach v_id in array p_ids loop
    select * into lr from public.laundry_requests where laundry_id = v_id for update;
    if lr.laundry_id is null or not app_private.can_see(c, v_id) then raise exception 'Laundry not found.'; end if;
    if lr.status <> v_from then raise exception 'Not allowed: LR-% is currently %.', v_id, lr.status; end if;
    if p_to = 'TAGGED' and not exists (select 1 from public.laundry_batches where laundry_id = v_id) then raise exception 'Generate the batch ID first.'; end if;
    update public.laundry_requests set status = p_to, returned_at = case when p_to = 'RETURNED' then now() else returned_at end where laundry_id = v_id;
    if p_to = 'READY_FOR_PICKUP' then
      loop
        v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
        exit when not exists (select 1 from public.laundry_batches where pickup_code = v_code and pickup_token_used_at is null);
      end loop;
      update public.laundry_batches set pickup_token = gen_random_uuid(), pickup_code = v_code, pickup_token_used_at = null where laundry_id = v_id;
    end if;
    perform app_private.audit(c, v_id, v_msg, v_from, p_to);
    if p_to = 'IN_LAUNDRY' then perform app_private.notify(lr.student_id, 'Laundry processing started', 'Batch L-' || v_id || ' entered the wash cycle'); end if;
    if p_to = 'RETURNED' then perform app_private.notify(lr.student_id, 'Laundry returned', 'L-' || v_id || ' is back from the laundry'); end if;
    if p_to = 'READY_FOR_PICKUP' then perform app_private.notify(lr.student_id, 'Laundry ready for pickup', 'Batch L-' || v_id || ' is ready at the counter'); end if;
    v_out := v_out || app_private.request_json(v_id);
  end loop;
  return v_out;
end $$;

create or replace function public.staff_send_delay_notice(p_id integer) returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); lr record;
begin
  select * into lr from public.laundry_requests where laundry_id = p_id;
  if lr.laundry_id is null or not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  perform app_private.audit(c, p_id, 'Delay notice sent to student', null, null);
  perform app_private.notify(lr.student_id, 'Laundry delayed', 'Batch L-' || p_id || ' is taking longer than expected');
end $$;

create or replace function public.staff_lookup_pickup(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); k text := lower(replace(regexp_replace(trim(coalesce(p_code, '')), '^hlp:', '', 'i'), ' ', '')); v_id int; lr record; lb record;
begin
  select laundry_id into v_id from public.laundry_batches where pickup_code = k or pickup_token::text = k order by batch_id desc limit 1;
  if v_id is null or not app_private.can_see(c, v_id) then return jsonb_build_object('kind', 'invalid'); end if;
  select * into lr from public.laundry_requests where laundry_id = v_id;
  select * into lb from public.laundry_batches where laundry_id = v_id;
  if lr.status = 'COLLECTED' or lb.pickup_token_used_at is not null then return jsonb_build_object('kind', 'used', 'request', app_private.request_json(v_id)); end if;
  if lr.status <> 'READY_FOR_PICKUP' then return jsonb_build_object('kind', 'invalid'); end if;
  return jsonb_build_object('kind', 'ok', 'request', app_private.request_json(v_id));
end $$;

create or replace function public.staff_confirm_collection(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); lr record; v_hit int;
begin
  select * into lr from public.laundry_requests where laundry_id = p_id for update;
  if lr.laundry_id is null or not app_private.can_see(c, p_id) then raise exception 'Laundry not found.'; end if;
  update public.laundry_batches set pickup_token_used_at = now() where laundry_id = p_id and pickup_token_used_at is null and pickup_code is not null returning laundry_id into v_hit;
  if v_hit is null or lr.status <> 'READY_FOR_PICKUP' then raise exception 'Token already used.'; end if;
  update public.laundry_requests set status = 'COLLECTED', collected_at = now() where laundry_id = p_id;
  perform app_private.audit(c, p_id, 'Collection confirmed. QR token used', 'READY_FOR_PICKUP', 'COLLECTED');
  perform app_private.notify(lr.student_id, 'Collection completed', 'Batch L-' || p_id || ' was collected');
  return app_private.request_json(p_id);
end $$;

-- ---------- 7. complaints (staff + admin) ------------------------------------------------
create or replace function public.complaint_add_note(p_id integer, p_text text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff','admin']);
begin
  if not app_private.can_see_complaint(c, p_id) then raise exception 'Complaint not found.'; end if;
  if p_text is null or trim(p_text) = '' then raise exception 'Write a note first.'; end if;
  insert into public.complaint_notes (complaint_id, author_name, author_role, note) values (p_id, c ->> 'name', c ->> 'role', trim(p_text));
  return app_private.complaint_json(p_id);
end $$;

create or replace function public.complaint_advance(p_id integer, p_note text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff','admin']); cm record; v_flow text[] := array['OPEN','UNDER_REVIEW','INVESTIGATING','RESOLVED','CLOSED']; v_i int; v_next text;
begin
  select * into cm from public.complaints where complaint_id = p_id for update;
  if cm.complaint_id is null or not app_private.can_see_complaint(c, p_id) then raise exception 'Complaint not found.'; end if;
  v_i := coalesce(array_position(v_flow, case cm.status when 'IN_PROGRESS' then 'UNDER_REVIEW' else cm.status end), 1);
  if v_i >= 5 then raise exception 'This complaint is already closed.'; end if;
  if v_i = 3 and not exists (select 1 from public.complaint_notes where complaint_id = p_id) and coalesce(trim(p_note), '') = '' then raise exception 'Add a resolution note first.'; end if;
  if coalesce(trim(p_note), '') <> '' then insert into public.complaint_notes (complaint_id, author_name, author_role, note) values (p_id, c ->> 'name', c ->> 'role', trim(p_note)); end if;
  v_next := v_flow[v_i + 1];
  update public.complaints set status = v_next, updated_at = now(), resolved_at = case when v_next = 'RESOLVED' then now() else resolved_at end where complaint_id = p_id;
  perform app_private.audit(c, cm.laundry_id, 'Complaint C-' || p_id || ' moved to ' || v_next, cm.status, v_next);
  perform app_private.notify(cm.student_id, 'Complaint update', 'C-' || p_id || ' is now ' || lower(replace(v_next, '_', ' ')));
  return app_private.complaint_json(p_id);
end $$;

create or replace function public.complaint_escalate(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['staff']); cm record;
begin
  select * into cm from public.complaints where complaint_id = p_id for update;
  if cm.complaint_id is null or not app_private.can_see_complaint(c, p_id) then raise exception 'Complaint not found.'; end if;
  update public.complaints set escalated = true, updated_at = now() where complaint_id = p_id;
  insert into public.complaint_notes (complaint_id, author_name, author_role, note) values (p_id, c ->> 'name', 'staff', 'Escalated to admin');
  perform app_private.audit(c, cm.laundry_id, 'Escalated complaint C-' || p_id || ' to admin', null, null);
  return app_private.complaint_json(p_id);
end $$;

create or replace function public.complaint_send_back(p_id integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); cm record;
begin
  select * into cm from public.complaints where complaint_id = p_id for update;
  if cm.complaint_id is null then raise exception 'Complaint not found.'; end if;
  update public.complaints set escalated = false, updated_at = now() where complaint_id = p_id;
  insert into public.complaint_notes (complaint_id, author_name, author_role, note) values (p_id, c ->> 'name', 'admin', 'Sent back to staff for follow-up');
  perform app_private.audit(c, cm.laundry_id, 'Complaint C-' || p_id || ' sent back to staff', null, null);
  return app_private.complaint_json(p_id);
end $$;

-- ---------- 8. admin ------------------------------------------------------------------------
create or replace function app_private.student_json(p_id integer) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'student_id', s.student_id, 'roll', upper(split_part(split_part(s.college_email, '@', 1), '.', 1)), 'name', s.name, 'phone', s.phone,
    'email', s.college_email, 'active', s.is_active,
    'enrollments', coalesce((select jsonb_agg(jsonb_build_object('semester_id', sem.semester_id, 'semester', sem.semester_name, 'hostel_code', h.code,
                                                                  'status', case when sem.is_active then 'Active' else 'Ended' end) order by sa.created_at)
                             from public.student_assignments sa join public.semesters sem on sem.semester_id = sa.semester_id
                             join public.hostels h on h.hostel_id = sa.hostel_id where sa.student_id = s.student_id), '[]'::jsonb))
  from public.students s where s.student_id = p_id $$;

create or replace function public.admin_list_students(p_search text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); q text := lower(trim(coalesce(p_search, '')));
begin
  return coalesce((select jsonb_agg(app_private.student_json(s.student_id) order by s.name)
                   from public.students s
                   where (s.auth_user_id is not null or exists (select 1 from public.student_assignments a where a.student_id = s.student_id))
                     and (q = '' or lower(s.name) like '%' || q || '%' or lower(s.college_email) like '%' || q || '%' or s.phone like '%' || q || '%')), '[]'::jsonb);
end $$;

create or replace function public.admin_get_student(p_roll text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); v_id int;
begin
  select student_id into v_id from public.students where upper(split_part(split_part(college_email, '@', 1), '.', 1)) = upper(trim(p_roll)) order by student_id limit 1;
  if v_id is null then raise exception 'Student not found.'; end if;
  return app_private.student_json(v_id);
end $$;

create or replace function public.admin_change_hostel(p_roll text, p_hostel_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); v_id int; v_new record; v_old text; v_assign int;
begin
  select student_id into v_id from public.students where upper(split_part(split_part(college_email, '@', 1), '.', 1)) = upper(trim(p_roll)) order by student_id limit 1;
  if v_id is null then raise exception 'Student not found.'; end if;
  select * into v_new from public.hostels where code = p_hostel_code and is_active;
  if v_new.hostel_id is null then raise exception 'Unknown hostel.'; end if;
  select sa.assignment_id, h.hostel_name into v_assign, v_old from public.student_assignments sa join public.semesters sem on sem.semester_id = sa.semester_id
    join public.hostels h on h.hostel_id = sa.hostel_id where sa.student_id = v_id and sem.is_active order by sa.created_at desc limit 1;
  if v_assign is null then raise exception 'This student has no active hostel assignment.'; end if;
  update public.student_assignments set hostel_id = v_new.hostel_id where assignment_id = v_assign;
  perform app_private.audit(c, null, 'Changed hostel for ' || upper(trim(p_roll)), v_old, v_new.hostel_name);
  return app_private.student_json(v_id);
end $$;

create or replace function public.admin_set_student_active(p_roll text, p_active boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); v_id int;
begin
  select student_id into v_id from public.students where upper(split_part(split_part(college_email, '@', 1), '.', 1)) = upper(trim(p_roll)) order by student_id limit 1;
  if v_id is null then raise exception 'Student not found.'; end if;
  update public.students set is_active = p_active where student_id = v_id;
  perform app_private.audit(c, null, case when p_active then 'Reactivated' else 'Deactivated' end || ' student ' || upper(trim(p_roll)), null, null);
  return app_private.student_json(v_id);
end $$;

create or replace function public.admin_list_staff() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.staff_id, 'name', s.name, 'email', lower(s.email), 'phone', s.phone, 'role', lower(s.role),
                                                       'hostel_code', h.code, 'active', s.is_active) order by s.role, s.name)
                   from public.staff s left join public.hostels h on h.hostel_id = s.hostel_id), '[]'::jsonb);
end $$;

create or replace function public.admin_add_staff(p_name text, p_phone text, p_email text, p_hostel_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); v_h int; v_id int; v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  if p_name is null or trim(p_name) = '' then raise exception 'Enter the staff member''s name.'; end if;
  if v_phone !~ '^\d{10}$' then raise exception 'Mobile number must be 10 digits.'; end if;
  if lower(coalesce(p_email, '')) !~ '^[^@\s]+@[^@\s]+$' then raise exception 'Enter a valid email address.'; end if;
  select hostel_id into v_h from public.hostels where code = p_hostel_code and is_active;
  if v_h is null then raise exception 'Choose a hostel counter.'; end if;
  if exists (select 1 from public.staff where lower(email) = lower(trim(p_email)) or phone = v_phone) then raise exception 'A staff account with this email or mobile number already exists.'; end if;
  insert into public.staff (name, email, phone, role, hostel_id) values (trim(p_name), lower(trim(p_email)), v_phone, 'STAFF', v_h) returning staff_id into v_id;
  perform app_private.audit(c, null, 'Added staff ' || trim(p_name) || ' (' || p_hostel_code || ')', null, null);
  return jsonb_build_object('id', v_id, 'name', trim(p_name), 'email', lower(trim(p_email)), 'phone', v_phone, 'role', 'staff', 'hostel_code', p_hostel_code, 'active', true);
end $$;

create or replace function public.admin_set_staff_active(p_id integer, p_active boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); s record;
begin
  select * into s from public.staff where staff_id = p_id;
  if s.staff_id is null then raise exception 'Staff member not found.'; end if;
  if s.role = 'ADMIN' and not p_active and (select count(*) from public.staff where role = 'ADMIN' and is_active) <= 1 then raise exception 'You cannot deactivate the only admin.'; end if;
  update public.staff set is_active = p_active where staff_id = p_id;
  perform app_private.audit(c, null, case when p_active then 'Reactivated' else 'Deactivated' end || ' staff ' || s.name, null, null);
  return jsonb_build_object('id', s.staff_id, 'name', s.name, 'email', lower(s.email), 'phone', s.phone, 'role', lower(s.role),
                            'hostel_code', (select code from public.hostels where hostel_id = s.hostel_id), 'active', p_active);
end $$;

create or replace function public.admin_add_hostel(p_code text, p_name text, p_gender text, p_collection_day integer, p_delivery_day integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); v_code text := upper(trim(coalesce(p_code, '')));
begin
  if v_code !~ '^[A-Z0-9]{1,5}$' then raise exception 'Hostel code must be 1 to 5 letters or digits.'; end if;
  if trim(coalesce(p_name, '')) = '' then raise exception 'Hostel name is required.'; end if;
  if p_gender not in ('Boys','Girls') then raise exception 'Choose Boys or Girls.'; end if;
  if exists (select 1 from public.hostels where code = v_code or lower(hostel_name) = lower(trim(p_name))) then raise exception 'Hostel already exists.'; end if;
  insert into public.hostels (hostel_name, code, gender, collection_day, delivery_day) values (trim(p_name), v_code, p_gender, p_collection_day, p_delivery_day);
  perform app_private.audit(c, null, 'Added hostel ' || trim(p_name), null, null);
  return jsonb_build_object('code', v_code, 'name', trim(p_name), 'gender', p_gender, 'collection_day', p_collection_day, 'delivery_day', p_delivery_day);
end $$;

create or replace function public.admin_add_category(p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']);
begin
  if trim(coalesce(p_name, '')) = '' then raise exception 'Category name is required.'; end if;
  if exists (select 1 from public.clothing_categories where lower(category_name) = lower(trim(p_name))) then raise exception 'Category already exists.'; end if;
  insert into public.clothing_categories (category_name) values (trim(p_name));
  perform app_private.audit(c, null, 'Added clothing category ' || trim(p_name), null, null);
end $$;

create or replace function public.admin_toggle_category(p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); v_on boolean;
begin
  update public.clothing_categories set is_active = not is_active where category_name = p_name returning is_active into v_on;
  if v_on is null then raise exception 'Category not found.'; end if;
  perform app_private.audit(c, null, case when v_on then 'Restored' else 'Retired' end || ' clothing category ' || p_name, null, null);
end $$;

create or replace function public.admin_add_condition(p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']);
begin
  if trim(coalesce(p_name, '')) = '' then raise exception 'Condition name is required.'; end if;
  insert into public.condition_options (name) values (trim(p_name)) on conflict (name) do update set is_active = true;
  perform app_private.audit(c, null, 'Added condition option ' || trim(p_name), null, null);
end $$;

create or replace function public.admin_remove_condition(p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']);
begin
  update public.condition_options set is_active = false where name = p_name;
  perform app_private.audit(c, null, 'Removed condition option ' || p_name, null, null);
end $$;

create or replace function public.admin_set_counter_enforcement(p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']);
begin
  insert into public.app_settings (key, value) values ('enforce_counter_hours', case when p_on then 'true' else 'false' end)
  on conflict (key) do update set value = excluded.value;
  perform app_private.audit(c, null, 'Counter hours rule ' || case when p_on then 'switched ON' else 'switched OFF (demo)' end, null, null);
end $$;

create or replace function public.admin_list_audit(p_search text default null, p_role text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb := app_private.need(array['admin']); q text := lower(trim(coalesce(p_search, '')));
begin
  return coalesce((select jsonb_agg(x order by (x ->> 'at') desc, (x ->> 'id')::int desc) from (
    select jsonb_build_object('id', a.audit_id, 'at', app_private.ts(a.created_at),
             'batch', case when a.laundry_id is null then '' else coalesce(lb.tag_code, 'LR-' || a.laundry_id) end,
             'who', coalesce(a.actor_name, st.name, 'Staff'), 'role', coalesce(a.actor_role, 'staff'), 'action', a.action, 'from', a.previous_value, 'to', a.new_value) as x
    from public.audit_logs a
    left join public.laundry_batches lb on lb.laundry_id = a.laundry_id
    left join public.staff st on st.staff_id = a.staff_id
    left join public.laundry_requests lr on lr.laundry_id = a.laundry_id
    left join public.students s on s.student_id = lr.student_id
    where (q = '' or lower(a.action) like '%' || q || '%' or lower(coalesce(a.actor_name, st.name, '')) like '%' || q || '%'
           or lower(coalesce(lb.tag_code, 'LR-' || a.laundry_id, '')) = q or lower(coalesce(lb.tag_code, '')) like '%' || q || '%'
           or upper(split_part(split_part(coalesce(s.college_email, ''), '@', 1), '.', 1)) = upper(trim(coalesce(p_search, ''))))
      and (coalesce(p_role, '') in ('', 'All') or lower(coalesce(a.actor_role, 'staff')) = lower(p_role))
    order by a.created_at desc, a.audit_id desc limit 500) t), '[]'::jsonb);
end $$;

-- ---------- 9. your two existing student functions, now reading hostel code/gender from the table ----------
create or replace function public.get_student_profile() returns json language plpgsql security definer set search_path = '' as $$
declare v_profile json;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select json_build_object('name', s.name, 'email', s.college_email, 'phone', s.phone, 'admissionYear', s.admission_year,
                           'hostel', h.code, 'gender', h.gender, 'room', a.room_number, 'semester', sem.semester_name)
    into v_profile
  from public.students s
  left join lateral (select sa.hostel_id, sa.room_number, sa.semester_id from public.student_assignments sa
                     where sa.student_id = s.student_id order by sa.created_at desc limit 1) a on true
  left join public.hostels h on h.hostel_id = a.hostel_id
  left join public.semesters sem on sem.semester_id = a.semester_id
  where s.auth_user_id = auth.uid();
  return v_profile;
end $$;

create or replace function public.register_student(p_name text, p_phone text, p_gender text, p_hostel_code text, p_room_number text, p_admission_year integer) returns json
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_email text := lower(auth.jwt() ->> 'email'); v_confirmed timestamptz; v_student_id int; v_hostel_id int; v_semester_id int;
begin
  if v_user_id is null or v_email is null then raise exception 'Authentication required'; end if;
  select email_confirmed_at into v_confirmed from auth.users where id = v_user_id;
  if v_confirmed is null then raise exception 'Please verify your email first'; end if;
  if v_email not like '%@thapar.edu' then raise exception 'A verified Thapar email is required'; end if;
  if p_name is null or trim(p_name) = '' or p_phone is null or p_phone !~ '^\d{10}$' or p_room_number is null
     or trim(p_room_number) !~ '^[A-Za-z0-9/ -]{1,8}$' or p_admission_year is null or p_admission_year < 2000
     or p_admission_year > extract(year from now())::int then raise exception 'Invalid profile details'; end if;
  if p_gender not in ('Boys','Girls') then raise exception 'Invalid gender selection'; end if;
  select hostel_id into v_hostel_id from public.hostels where code = p_hostel_code and gender = p_gender and is_active;
  if v_hostel_id is null then raise exception 'Invalid hostel selection'; end if;
  select semester_id into v_semester_id from public.semesters where cohort_year = p_admission_year and is_active = true;
  if v_semester_id is null then raise exception 'No active semester is configured for your admission year'; end if;
  insert into public.students (name, college_email, phone, auth_user_id, admission_year)
  values (trim(p_name), v_email, p_phone, v_user_id, p_admission_year)
  on conflict (college_email) do update set name = excluded.name, phone = excluded.phone, auth_user_id = excluded.auth_user_id, admission_year = excluded.admission_year
    where public.students.auth_user_id is null or public.students.auth_user_id = excluded.auth_user_id
  returning student_id into v_student_id;
  if v_student_id is null then raise exception 'This email is already linked to another account'; end if;
  insert into public.student_assignments (student_id, hostel_id, semester_id, room_number)
  values (v_student_id, v_hostel_id, v_semester_id, trim(p_room_number))
  on conflict (student_id, semester_id) do update set hostel_id = excluded.hostel_id, room_number = excluded.room_number;
  return json_build_object('success', true, 'student_id', v_student_id);
end $$;

-- ---------- 10. who may call what: signed-in users only (the mobile lookup is the one public function) ----------
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname in ('get_my_role','get_app_config','list_requests','get_request','list_complaints','get_complaint','complaint_add_note',
             'complaint_advance','complaint_escalate','complaint_send_back','get_student_profile','register_student') or p.proname like 'student\_%' or p.proname like 'staff\_%' or p.proname like 'admin\_%') loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
revoke all on function public.staff_login_email(text) from public;
grant execute on function public.staff_login_email(text) to anon, authenticated;

commit;

-- OPTIONAL, run later once you no longer use the old final_student.html page:
-- the new app submits through student_submit_request (which enforces laundry days and counter hours).
-- Removing direct access to the old function closes the back door around that rule.
-- revoke execute on function public.submit_laundry_request(jsonb, text) from anon, authenticated;
