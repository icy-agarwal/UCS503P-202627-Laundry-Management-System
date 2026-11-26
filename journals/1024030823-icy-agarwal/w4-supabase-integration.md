# Week 4

## Work Done

- Changed the architecture of the system: instead of routing every request through the **Node.js and Express** server, the app now talks to **Supabase** directly through **PostgreSQL functions** (called as RPC from the app). The Express server is no longer needed to run the application.
- Wrote a main SQL script that:
  - added the missing columns and tables to the existing Supabase database (item conditions, condition options, complaint notes and app settings),
  - relaxed two audit log columns so that system actions can also be recorded,
  - created around 50 SQL functions for the student, staff, admin and complaint workflows, including private helper functions,
  - replaced `register_student` and `get_student_profile` so that hostel code and gender come from the **hostels** table instead of a fixed list in the code.
- Built the server-side rules inside the database:
  - every function checks the role of the caller before doing anything,
  - staff can see and change only the requests of their own hostel,
  - the status order of a request is enforced (for example, a request that is already handled cannot be verified again),
  - laundry days and counter hours are checked in the database, with an admin setting to turn this check off for demonstrations,
  - the pickup code can be used only once, so collecting twice with the same code is rejected,
  - every important action is written to the audit log.
- Designed a login method for **staff and admin**: they type their mobile number, the app finds the registered email and the one-time code is sent to that email. This avoids SMS costs and keeps email-based security.
- Ran the SQL script in the **Supabase SQL Editor** and confirmed the "Success" message. Checked the warning that Supabase shows for scripts with `drop` statements, and confirmed that it only removes old constraints and not data.
- Created the staff and admin accounts with a second script: **2 admins and 17 staff accounts**, one for each hostel. Because every account needs a different email, the same inbox was reused with Gmail plus-addressing.
- Prepared a demo data script with 16 sample students and 28 requests in every stage, together with a script that removes only that sample data.
- Connected the frontend to Supabase through environment variables (project URL and publishable key), so the same screens now run on the real database.
- Ran the web build locally (`npm run build:web`) and confirmed that it exports successfully.
- Documented the setup steps in `supabase/SETUP.md` and the API details in `docs`.

## Learning

Learned how to build a backend with only a database: PostgreSQL functions with **security definer**, role checks inside each function, and calling them from the frontend. Learned why important rules must be enforced on the server side and not only in the interface, since the interface can be bypassed.

Also learned how email OTP login works in Supabase, why the built-in email sender has a low hourly limit, and why the publishable key is safe in the app while a secret key must never be.

## Challenges Faced

- Moving the business rules from the Express routes and the mock data into SQL functions without changing the inputs and outputs that the screens expect.
- Letting staff and admin log in with a mobile number without paying for SMS.
- A unique email rule for staff, which meant that one inbox could not be used for several accounts directly.
- Supabase showing a "potential destructive operation" warning, which needed careful checking of the script before running it.
- Making the pickup code single-use even if two people try to use it at the same moment.

## Next Steps

- Push the final frontend to the project repository.
- Deploy the web version of the app on **Vercel**.
- Add the live address to the Supabase URL configuration.
- Set up a custom email sender (SMTP) so that logins do not stop during a live demo.
