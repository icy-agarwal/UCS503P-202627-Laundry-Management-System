-- Removes ONLY the sample data created by 03_demo_data.sql (students whose email ends with .demo@thapar.edu).
-- Real students, staff and your own requests are not touched.
begin;
with d as (select student_id from public.students where college_email like '%.demo@thapar.edu')
, r as (select laundry_id from public.laundry_requests where student_id in (select student_id from d))
, c as (select complaint_id from public.complaints where student_id in (select student_id from d))
, x1 as (delete from public.complaint_notes where complaint_id in (select complaint_id from c))
, x2 as (delete from public.complaints where complaint_id in (select complaint_id from c))
, x3 as (delete from public.notifications where student_id in (select student_id from d))
, x4 as (delete from public.audit_logs where laundry_id in (select laundry_id from r))
, x5 as (delete from public.laundry_item_conditions where laundry_id in (select laundry_id from r))
, x6 as (delete from public.laundry_items where laundry_id in (select laundry_id from r))
, x7 as (delete from public.laundry_batches where laundry_id in (select laundry_id from r))
, x8 as (delete from public.laundry_requests where laundry_id in (select laundry_id from r))
, x9 as (delete from public.student_assignments where student_id in (select student_id from d))
delete from public.students where student_id in (select student_id from d);
commit;
