-- =====================================================================================
-- STEP 2: create your admin and staff accounts. EDIT the rows below, then run.
--   * name  : the person's name
--   * email : an inbox they can open. The login code is emailed here.
--   * phone : 10-digit mobile number. This is what they type to log in.
--   * role  : 'ADMIN' or 'STAFF'
--   * hostel: the hostel code the staff member works at (O, A, E ...). Leave null for the admin.
-- They log in by typing the mobile number; the code arrives on the email. No passwords.
-- Safe to re-run (matching email/phone is updated, not duplicated).
-- =====================================================================================
insert into public.staff (name, email, phone, role, hostel_id)
select v.name, lower(v.email), v.phone, v.role, h.hostel_id
from (values
  ('Admin Name',   'admin@thapar.edu',  '9000000001', 'ADMIN', null),
  ('Staff Name 1', 'staff1@thapar.edu', '9000000002', 'STAFF', 'O'),
  ('Staff Name 2', 'staff2@thapar.edu', '9000000003', 'STAFF', 'E')
) as v(name, email, phone, role, hostel_code)
left join public.hostels h on h.code = v.hostel_code
on conflict (lower(email)) do update set name = excluded.name, phone = excluded.phone, role = excluded.role, hostel_id = excluded.hostel_id, is_active = true;

select name, email, phone, role, (select code from public.hostels h where h.hostel_id = s.hostel_id) as hostel from public.staff s order by role, name;
