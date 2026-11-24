-- =====================================================================================
-- STEP 3 (optional): sample data so every staff and admin screen has something to show.
-- Needs step 1 and step 2 done first. Sample students have NO login and use emails ending in
-- .demo@thapar.edu, so they never mix with real students. Remove them any time with
-- 99_remove_demo_data.sql. Safe to run once; running twice is blocked.
-- =====================================================================================
begin;
do $$ begin
  if exists (select 1 from public.students where college_email like '%.demo@thapar.edu') then raise exception 'Demo data is already loaded. Run 99_remove_demo_data.sql first if you want to reload it.'; end if;
  if not exists (select 1 from public.staff where role = 'ADMIN') then raise exception 'Run 02_staff_admin_accounts.sql first.'; end if;
end $$;

create temp table seed_ids (k text primary key, laundry_id int) on commit drop;

-- sample students (no login) and their hostel for the active semester of their admission year

insert into public.students (name, college_email, phone, admission_year)
values
  ('Aarav Mehta', '24coe156.demo@thapar.edu', '9000000000', 2024),
  ('Kabir Singh', '24coe201.demo@thapar.edu', '9000000000', 2024),
  ('Rohan Gupta', '24coe087.demo@thapar.edu', '9000000000', 2024),
  ('Nikhil Bansal', '24coe065.demo@thapar.edu', '9000000000', 2024),
  ('Aditya Rao', '23coe310.demo@thapar.edu', '9000000000', 2023),
  ('Yash Chawla', '24coe355.demo@thapar.edu', '9000000000', 2024),
  ('Arjun Malhotra', '24coe301.demo@thapar.edu', '9000000000', 2024),
  ('Manav Sethi', '25coe044.demo@thapar.edu', '9000000000', 2025),
  ('Karan Joshi', '24coe322.demo@thapar.edu', '9000000000', 2024),
  ('Harsh Vardhan', '24coe340.demo@thapar.edu', '9000000000', 2024),
  ('Ishita Verma', '24coe144.demo@thapar.edu', '9000000000', 2024),
  ('Meera Nair', '24coe099.demo@thapar.edu', '9000000000', 2024),
  ('Tanya Arora', '24coe178.demo@thapar.edu', '9000000000', 2024),
  ('Sneha Kapoor', '24coe212.demo@thapar.edu', '9000000000', 2024),
  ('Priya Malhotra', '25coe012.demo@thapar.edu', '9000000000', 2025),
  ('Simran Kaur', '24coe333.demo@thapar.edu', '9000000000', 2024);

insert into public.student_assignments (student_id, hostel_id, semester_id, room_number)
select s.student_id, h.hostel_id, sem.semester_id, v.room
from (values
  ('24coe156.demo@thapar.edu', 'O', '100'),
  ('24coe201.demo@thapar.edu', 'O', '111'),
  ('24coe087.demo@thapar.edu', 'O', '122'),
  ('24coe065.demo@thapar.edu', 'O', '133'),
  ('23coe310.demo@thapar.edu', 'O', '144'),
  ('24coe355.demo@thapar.edu', 'O', '155'),
  ('24coe301.demo@thapar.edu', 'A', '166'),
  ('25coe044.demo@thapar.edu', 'A', '177'),
  ('24coe322.demo@thapar.edu', 'B', '188'),
  ('24coe340.demo@thapar.edu', 'H', '199'),
  ('24coe144.demo@thapar.edu', 'E', '210'),
  ('24coe099.demo@thapar.edu', 'E', '221'),
  ('24coe178.demo@thapar.edu', 'E', '232'),
  ('24coe212.demo@thapar.edu', 'G', '243'),
  ('25coe012.demo@thapar.edu', 'G', '254'),
  ('24coe333.demo@thapar.edu', 'G', '265')
) as v(email, hostel_code, room)
join public.students s on s.college_email = v.email
join public.hostels h on h.code = v.hostel_code
join public.semesters sem on sem.cohort_year = s.admission_year and sem.is_active;


create function pg_temp.mk(p_key text, p_roll text, p_status text, p_days numeric, p_orig jsonb, p_items jsonb, p_cond jsonb, p_remark text, p_tat numeric, p_late boolean, p_code text) returns void
language plpgsql as $f$
declare
  s record; a record; h record; st record; v_id int; t0 timestamp; k text; v_n int; v_old int; v_order text[] := array['SUBMITTED','VERIFIED','TAGGED','IN_LAUNDRY','RETURNED','READY_FOR_PICKUP','COLLECTED'];
  v_i int := array_position(v_order, p_status); v_exp timestamp; v_ret timestamp; v_who text; v_staff int; changes text[] := '{}'; c jsonb;
begin
  select * into s from public.students where college_email = lower(p_roll) || '.demo@thapar.edu';
  select sa.* into a from public.student_assignments sa where sa.student_id = s.student_id order by sa.created_at desc limit 1;
  select * into h from public.hostels where hostel_id = a.hostel_id;
  select * into st from public.staff where hostel_id = h.hostel_id and is_active limit 1;
  if st.staff_id is null then select * into st from public.staff where role = 'STAFF' and is_active order by staff_id limit 1; end if;
  v_staff := st.staff_id; v_who := coalesce(st.name, 'Counter staff');
  t0 := (now() at time zone 'UTC') - make_interval(hours => (p_days * 24 + 3 + (random() * 4))::int);
  v_exp := (t0::date + coalesce(nullif((h.delivery_day - extract(dow from t0)::int + 7) % 7, 0), 7))::timestamp;
  if p_late then v_exp := ((now() at time zone 'UTC')::date - 1)::timestamp; end if;
  v_ret := case when v_i >= 5 then least(t0 + make_interval(hours => (coalesce(p_tat, 3) * 24)::int), (now() at time zone 'UTC') - interval '1 hour') end;
  insert into public.laundry_requests (student_id, assignment_id, status, submitted_at, expected_completion, collected_at, remarks, verified_at, returned_at)
  values (s.student_id, a.assignment_id, p_status, t0, v_exp, case when v_i = 7 then least(v_ret + interval '2 hours', (now() at time zone 'UTC')) end,
          nullif(p_remark, ''), case when v_i >= 2 then t0 + interval '20 minutes' end, v_ret) returning laundry_id into v_id;
  insert into seed_ids values (p_key, v_id);
  for k in select jsonb_object_keys(p_orig) loop
    insert into public.laundry_items (laundry_id, category_id, quantity, verified_quantity)
    select v_id, category_id, (p_orig ->> k)::int, case when v_i >= 2 then coalesce((p_items ->> k)::int, 0) end from public.clothing_categories where category_name = k;
  end loop;
  if p_items is not null and v_i >= 2 then
    for k in select jsonb_object_keys(p_items) loop
      if not (p_orig ? k) then
        insert into public.laundry_items (laundry_id, category_id, quantity, verified_quantity) select v_id, category_id, 0, (p_items ->> k)::int from public.clothing_categories where category_name = k;
      end if;
    end loop;
  end if;
  for c in select value from jsonb_array_elements(p_cond) loop
    insert into public.laundry_item_conditions (laundry_id, category_id, condition_name) select v_id, category_id, c ->> 'k' from public.clothing_categories where category_name = c ->> 'c';
  end loop;
  if p_items is not null then
    for k in select jsonb_object_keys(p_orig || p_items) loop
      if coalesce((p_orig ->> k)::int, 0) <> coalesce((p_items ->> k)::int, 0) then changes := changes || (k || ' ' || coalesce(p_orig ->> k, '0') || ' to ' || coalesce(p_items ->> k, '0')); end if;
    end loop;
  end if;
  if v_i >= 3 then
    insert into public.laundry_batches (laundry_id, tag_code, created_at) values (v_id, 'L-' || v_id, t0 + interval '25 minutes');
  end if;
  if v_i >= 6 then
    update public.laundry_batches set pickup_token = gen_random_uuid(), pickup_code = coalesce(p_code, lpad((100000 + (v_id * 7919) % 900000)::text, 6, '0')),
           pickup_token_used_at = case when v_i = 7 then least(v_ret + interval '2 hours', (now() at time zone 'UTC')) end where laundry_id = v_id;
  end if;
  -- history
  insert into public.audit_logs (staff_id, laundry_id, action, previous_value, new_value, actor_name, actor_role, created_at)
  select * from (values
    (null::int, v_id, 'Submitted request', null, 'SUBMITTED', s.name, 'student', t0),
    (case when v_i >= 2 then v_staff end, v_id, case when cardinality(changes) > 0 then 'Verified. Changed ' || array_to_string(changes, ', ') else 'Verified physical count, no changes' end, 'SUBMITTED', 'VERIFIED', v_who, 'staff', t0 + interval '20 minutes'),
    (case when v_i >= 3 then v_staff end, v_id, 'Generated batch ID L-' || v_id, null, null, v_who, 'staff', t0 + interval '25 minutes'),
    (case when v_i >= 3 then v_staff end, v_id, 'Tag applied', 'VERIFIED', 'TAGGED', v_who, 'staff', t0 + interval '30 minutes'),
    (case when v_i >= 4 then v_staff end, v_id, 'Sent to laundry', 'TAGGED', 'IN_LAUNDRY', v_who, 'staff', t0 + interval '40 minutes'),
    (case when v_i >= 5 then v_staff end, v_id, 'Marked returned', 'IN_LAUNDRY', 'RETURNED', v_who, 'staff', v_ret),
    (case when v_i >= 6 then v_staff end, v_id, 'Marked ready for pickup. QR activated', 'RETURNED', 'READY_FOR_PICKUP', v_who, 'staff', v_ret + interval '1 hour'),
    (case when v_i >= 7 then v_staff end, v_id, 'Collection confirmed. QR token used', 'READY_FOR_PICKUP', 'COLLECTED', v_who, 'staff', least(v_ret + interval '2 hours', now() at time zone 'UTC'))
  ) as x(staff_id, laundry_id, action, previous_value, new_value, actor_name, actor_role, created_at)
  where (x.action = 'Submitted request') or (x.staff_id is not null);
  if v_i >= 2 then
    for k in select jsonb_object_keys(p_orig || p_items) loop
      if coalesce((p_orig ->> k)::int, 0) <> coalesce((p_items ->> k)::int, 0) then
        insert into public.audit_logs (staff_id, laundry_id, action, previous_value, new_value, actor_name, actor_role, created_at)
        values (v_staff, v_id, 'Changed student''s entry at verification', k || ' ' || coalesce(p_orig ->> k, '0'), k || ' ' || coalesce(p_items ->> k, '0'), v_who, 'staff', t0 + interval '21 minutes');
      end if;
    end loop;
  end if;
end $f$;


-- sample laundry requests in every stage

select pg_temp.mk('O1', '24COE087', 'SUBMITTED', 0, '{"Bedsheet": 1, "Towel": 2}'::jsonb, null, '[]'::jsonb, '', null, false, null);
select pg_temp.mk('O2', '24COE201', 'SUBMITTED', 0, '{"Shirts": 3, "T-Shirts": 4, "Jeans / Pants": 2}'::jsonb, null, '[]'::jsonb, '', null, false, null);
select pg_temp.mk('O3', '24COE156', 'SUBMITTED', 0, '{"Shirts": 2, "T-Shirts": 3, "Jeans / Pants": 2}'::jsonb, null, '[]'::jsonb, 'Small tear on one shirt collar', null, false, null);
select pg_temp.mk('O4', '24COE065', 'VERIFIED', 0, '{"Shirts": 4, "Jeans / Pants": 1}'::jsonb, '{"Shirts": 4, "Jeans / Pants": 1}'::jsonb, '[{"c": "Shirts", "k": "Faded color"}]'::jsonb, '', null, false, null);
select pg_temp.mk('O5', '23COE310', 'TAGGED', 1, '{"Towel": 3, "Bedsheet": 1}'::jsonb, '{"Towel": 3, "Bedsheet": 1}'::jsonb, '[]'::jsonb, '', null, false, null);
select pg_temp.mk('O6', '24COE355', 'IN_LAUNDRY', 2, '{"Shirts": 3, "T-Shirts": 4, "Jeans / Pants": 2}'::jsonb, '{"Shirts": 2, "T-Shirts": 4, "Jeans / Pants": 2}'::jsonb, '[{"c": "Shirts", "k": "Small tear"}]'::jsonb, '', null, false, null);
select pg_temp.mk('O7', '24COE156', 'IN_LAUNDRY', 5, '{"Shirts": 5}'::jsonb, '{"Shirts": 5}'::jsonb, '[]'::jsonb, '', null, true, null);
select pg_temp.mk('O8', '24COE201', 'RETURNED', 4, '{"Jeans / Pants": 3, "T-Shirts": 2}'::jsonb, '{"Jeans / Pants": 3, "T-Shirts": 2}'::jsonb, '[]'::jsonb, '', 4, false, null);
select pg_temp.mk('O9', '24COE087', 'READY_FOR_PICKUP', 6, '{"Bedsheet": 1, "Towel": 2}'::jsonb, '{"Bedsheet": 1, "Towel": 2}'::jsonb, '[]'::jsonb, '', 5, false, '482915');
select pg_temp.mk('O10', '24COE065', 'READY_FOR_PICKUP', 3, '{"Shirts": 6}'::jsonb, '{"Shirts": 6}'::jsonb, '[{"c": "Shirts", "k": "Stain"}]'::jsonb, 'Ink stain on one shirt, existing', 3, false, '731064');
select pg_temp.mk('O11', '24COE156', 'COLLECTED', 12, '{"Shirts": 2, "T-Shirts": 3}'::jsonb, '{"Shirts": 2, "T-Shirts": 3}'::jsonb, '[]'::jsonb, '', 5, false, null);
select pg_temp.mk('O12', '24COE087', 'COLLECTED', 15, '{"T-Shirts": 5, "Jeans / Pants": 2}'::jsonb, '{"T-Shirts": 5, "Jeans / Pants": 2}'::jsonb, '[]'::jsonb, '', 6, false, null);
select pg_temp.mk('O13', '24COE355', 'COLLECTED', 20, '{"Shirts": 2, "Jeans / Pants": 3, "Towel": 1}'::jsonb, '{"Shirts": 2, "Jeans / Pants": 3, "Towel": 1}'::jsonb, '[]'::jsonb, '', 5, false, null);
select pg_temp.mk('O14', '23COE310', 'COLLECTED', 25, '{"Shirts": 3, "T-Shirts": 2}'::jsonb, '{"Shirts": 3, "T-Shirts": 2}'::jsonb, '[]'::jsonb, '', 4, false, null);
select pg_temp.mk('A1', '24COE301', 'IN_LAUNDRY', 2, '{"Shirts": 3, "T-Shirts": 3}'::jsonb, '{"Shirts": 3, "T-Shirts": 3}'::jsonb, '[]'::jsonb, '', null, false, null);
select pg_temp.mk('A2', '25COE044', 'COLLECTED', 8, '{"Shirts": 2, "T-Shirts": 2}'::jsonb, '{"Shirts": 2, "T-Shirts": 2}'::jsonb, '[]'::jsonb, '', 3, false, null);
select pg_temp.mk('A3', '24COE301', 'COLLECTED', 13, '{"Shirts": 4, "T-Shirts": 3}'::jsonb, '{"Shirts": 4, "T-Shirts": 3}'::jsonb, '[]'::jsonb, '', 4, false, null);
select pg_temp.mk('B1', '24COE322', 'READY_FOR_PICKUP', 3, '{"Shirts": 3, "Jeans / Pants": 2}'::jsonb, '{"Shirts": 3, "Jeans / Pants": 2}'::jsonb, '[]'::jsonb, '', 5, false, '664201');
select pg_temp.mk('B2', '24COE322', 'COLLECTED', 9, '{"Shirts": 4, "T-Shirts": 4}'::jsonb, '{"Shirts": 4, "T-Shirts": 4}'::jsonb, '[]'::jsonb, '', 6, false, null);
select pg_temp.mk('H1', '24COE340', 'IN_LAUNDRY', 6, '{"Shirts": 4, "T-Shirts": 3}'::jsonb, '{"Shirts": 4, "T-Shirts": 3}'::jsonb, '[]'::jsonb, '', null, true, null);
select pg_temp.mk('H2', '24COE340', 'COLLECTED', 10, '{"Shirts": 3, "T-Shirts": 2}'::jsonb, '{"Shirts": 3, "T-Shirts": 2}'::jsonb, '[]'::jsonb, '', 4, false, null);
select pg_temp.mk('E1', '24COE144', 'SUBMITTED', 0, '{"Kurta / Salwar": 3, "Pyjama": 2}'::jsonb, null, '[]'::jsonb, '', null, false, null);
select pg_temp.mk('E2', '24COE099', 'TAGGED', 1, '{"Towel": 2, "Pillow Cover": 2}'::jsonb, '{"Towel": 2, "Pillow Cover": 2}'::jsonb, '[]'::jsonb, '', null, false, null);
select pg_temp.mk('E3', '24COE178', 'IN_LAUNDRY', 5, '{"Kurta / Salwar": 4, "Turban / Dupatta": 2}'::jsonb, '{"Kurta / Salwar": 4, "Turban / Dupatta": 2}'::jsonb, '[]'::jsonb, '', null, true, null);
select pg_temp.mk('E4', '24COE144', 'COLLECTED', 11, '{"Kurta / Salwar": 3, "Towel": 1}'::jsonb, '{"Kurta / Salwar": 3, "Towel": 1}'::jsonb, '[]'::jsonb, '', 4, false, null);
select pg_temp.mk('G1', '24COE212', 'READY_FOR_PICKUP', 3, '{"Kurta / Salwar": 5}'::jsonb, '{"Kurta / Salwar": 5}'::jsonb, '[]'::jsonb, '', 4, false, '318450');
select pg_temp.mk('G2', '25COE012', 'COLLECTED', 9, '{"T-Shirts": 3, "Jeans / Pants": 2}'::jsonb, '{"T-Shirts": 3, "Jeans / Pants": 2}'::jsonb, '[]'::jsonb, '', 5, false, null);
select pg_temp.mk('G3', '24COE333', 'IN_LAUNDRY', 2, '{"Shirts": 2, "Pyjama": 2}'::jsonb, '{"Shirts": 2, "Pyjama": 2}'::jsonb, '[]'::jsonb, '', null, false, null);

-- sample complaints
with c as (insert into public.complaints (student_id, laundry_id, subject, complaint_type, description, status, escalated, created_at, resolved_at)
  select lr.student_id, lr.laundry_id, 'Damaged', 'Damaged', 'Towel came back with a tear along one edge.', 'OPEN', false, (now() at time zone 'UTC') - interval '5 hours',
         null
  from public.laundry_requests lr join seed_ids i on i.laundry_id = lr.laundry_id where i.k = 'O13' returning complaint_id, laundry_id)
insert into public.complaint_notes (complaint_id, author_name, author_role, note, created_at)
select c.complaint_id, case n.role when 'admin' then (select name from public.staff where role = 'ADMIN' limit 1) else coalesce((select st.name from public.staff st join public.student_assignments sa on sa.hostel_id = st.hostel_id
         join public.laundry_requests lr on lr.assignment_id = sa.assignment_id where lr.laundry_id = c.laundry_id limit 1), 'Counter staff') end,
       n.role, n.note, (now() at time zone 'UTC') - make_interval(secs => n.hrs * 3600)
from c cross join (values ('x','x',0)) as n(role, note, hrs) where false;
with c as (insert into public.complaints (student_id, laundry_id, subject, complaint_type, description, status, escalated, created_at, resolved_at)
  select lr.student_id, lr.laundry_id, 'Wrong item', 'Wrong item', 'One shirt in my bag is not mine. It is a white shirt with a different brand.', 'UNDER_REVIEW', true, (now() at time zone 'UTC') - interval '72 hours',
         null
  from public.laundry_requests lr join seed_ids i on i.laundry_id = lr.laundry_id where i.k = 'B2' returning complaint_id, laundry_id)
insert into public.complaint_notes (complaint_id, author_name, author_role, note, created_at)
select c.complaint_id, case n.role when 'admin' then (select name from public.staff where role = 'ADMIN' limit 1) else coalesce((select st.name from public.staff st join public.student_assignments sa on sa.hostel_id = st.hostel_id
         join public.laundry_requests lr on lr.assignment_id = sa.assignment_id where lr.laundry_id = c.laundry_id limit 1), 'Counter staff') end,
       n.role, n.note, (now() at time zone 'UTC') - make_interval(secs => n.hrs * 3600)
from c cross join (values ('staff', 'Checked the racks and the register. Count matches at pickup, so the item may have been swapped with another student''s. Cannot resolve at the counter.', 71), ('staff', 'Escalated to admin', 70.9)) as n(role, note, hrs);
with c as (insert into public.complaints (student_id, laundry_id, subject, complaint_type, description, status, escalated, created_at, resolved_at)
  select lr.student_id, lr.laundry_id, 'Missing', 'Missing', '1 T-shirt missing from the batch. I submitted 3 and received 2.', 'INVESTIGATING', false, (now() at time zone 'UTC') - interval '192 hours',
         null
  from public.laundry_requests lr join seed_ids i on i.laundry_id = lr.laundry_id where i.k = 'G2' returning complaint_id, laundry_id)
insert into public.complaint_notes (complaint_id, author_name, author_role, note, created_at)
select c.complaint_id, case n.role when 'admin' then (select name from public.staff where role = 'ADMIN' limit 1) else coalesce((select st.name from public.staff st join public.student_assignments sa on sa.hostel_id = st.hostel_id
         join public.laundry_requests lr on lr.assignment_id = sa.assignment_id where lr.laundry_id = c.laundry_id limit 1), 'Counter staff') end,
       n.role, n.note, (now() at time zone 'UTC') - make_interval(secs => n.hrs * 3600)
from c cross join (values ('staff', 'Checked the register. Count at verification was 3. Searching the returned racks.', 180.0)) as n(role, note, hrs);
with c as (insert into public.complaints (student_id, laundry_id, subject, complaint_type, description, status, escalated, created_at, resolved_at)
  select lr.student_id, lr.laundry_id, 'Delay', 'Delay', 'My laundry was due earlier this week and is still not returned.', 'RESOLVED', false, (now() at time zone 'UTC') - interval '144 hours',
         (now() at time zone 'UTC') - interval '72.0 hours'
  from public.laundry_requests lr join seed_ids i on i.laundry_id = lr.laundry_id where i.k = 'A2' returning complaint_id, laundry_id)
insert into public.complaint_notes (complaint_id, author_name, author_role, note, created_at)
select c.complaint_id, case n.role when 'admin' then (select name from public.staff where role = 'ADMIN' limit 1) else coalesce((select st.name from public.staff st join public.student_assignments sa on sa.hostel_id = st.hostel_id
         join public.laundry_requests lr on lr.assignment_id = sa.assignment_id where lr.laundry_id = c.laundry_id limit 1), 'Counter staff') end,
       n.role, n.note, (now() at time zone 'UTC') - make_interval(secs => n.hrs * 3600)
from c cross join (values ('staff', 'Batch was held up by a machine fault. Returned the same day and student informed.', 120)) as n(role, note, hrs);
with c as (insert into public.complaints (student_id, laundry_id, subject, complaint_type, description, status, escalated, created_at, resolved_at)
  select lr.student_id, lr.laundry_id, 'Incorrect quantity', 'Incorrect quantity', 'The slip said 6 pieces but I only got 5.', 'CLOSED', false, (now() at time zone 'UTC') - interval '216 hours',
         (now() at time zone 'UTC') - interval '108.0 hours'
  from public.laundry_requests lr join seed_ids i on i.laundry_id = lr.laundry_id where i.k = 'H2' returning complaint_id, laundry_id)
insert into public.complaint_notes (complaint_id, author_name, author_role, note, created_at)
select c.complaint_id, case n.role when 'admin' then (select name from public.staff where role = 'ADMIN' limit 1) else coalesce((select st.name from public.staff st join public.student_assignments sa on sa.hostel_id = st.hostel_id
         join public.laundry_requests lr on lr.assignment_id = sa.assignment_id where lr.laundry_id = c.laundry_id limit 1), 'Counter staff') end,
       n.role, n.note, (now() at time zone 'UTC') - make_interval(secs => n.hrs * 3600)
from c cross join (values ('staff', 'Verified count was 6. Found the sixth piece in another bag and handed it over.', 216), ('admin', 'Student confirmed all items received. Closing.', 192)) as n(role, note, hrs);

commit;

select status, count(*) from public.laundry_requests group by status order by status;
