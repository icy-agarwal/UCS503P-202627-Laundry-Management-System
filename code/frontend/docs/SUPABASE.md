# Supabase mode

See `supabase/SETUP.md` for the step-by-step guide. Summary:

* The app talks straight to Supabase (`src/api/supabase.ts`); there is no Express server.
* Login is Supabase email OTP. Staff and admin type their mobile number; the code is sent to the email stored in the `staff` table.
* All data access goes through `SECURITY DEFINER` Postgres functions that check who is calling (student, staff of one hostel, or admin).
  Tables have row-level security on and no public policies, so the publishable key alone can read nothing.
* Rules enforced in the database: laundry days and counter hours (can be switched off for demos), the status order
  (submitted -> verified -> tagged -> in laundry -> returned -> ready -> collected), hostel isolation for staff, and single-use pickup tokens.
* Semesters follow each admission year (your `semesters.cohort_year`), so the demo-mode "start semester / renewal" screens are hidden.
