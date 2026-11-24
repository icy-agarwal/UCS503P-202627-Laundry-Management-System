# Connect the app to your Supabase project (staff + admin + students)

You do this once. Everything runs inside the Supabase dashboard; no server is needed.

## Step 1: run the main script
1. Open your project at supabase.com, click **SQL Editor** in the left bar, then **New query**.
2. Open `supabase/01_schema_and_functions.sql`, copy ALL of it, paste it into the editor and press **Run**.
3. You should see "Success". If you see a red error, copy the exact words and send them to me. Nothing is half-applied,
   because the script is one transaction.

It adds the missing columns and tables, the functions for staff, admin, complaints and pickup QR, and replaces
`register_student` and `get_student_profile` with versions that read hostel codes from the table. Your data is kept.

## Step 2: create the admin and staff accounts
1. Open `supabase/02_staff_admin_accounts.sql`.
2. Change the three example rows: name, **email** (an inbox the person can open), **mobile number**, role and hostel code.
3. Paste into a new query and Run. The result table lists the accounts.

Staff and admin log in by typing their **mobile number**; the one-time code is emailed to the email you entered.

## Step 3 (optional): sample data for the presentation
Run `supabase/03_demo_data.sql` after step 2. It adds 16 sample students and 28 laundry requests in every stage, plus
complaints and an audit history, so every staff and admin screen has content. Sample students cannot log in.
To remove it later, run `supabase/99_remove_demo_data.sql`. Your real students and requests are not touched.

## Step 4: email limits (important before a live demo)
Supabase's built-in email sender allows only a few emails per hour. For a demo with several people logging in, open
**Authentication -> Emails -> SMTP Settings** and enter a real SMTP account (a Gmail app password or a free Resend/Brevo account).
Logged-in users stay logged in on the same device, so each person only needs a code once.

## Step 5: run the app
```
npm install
npm run web
```
`.env` already contains your Supabase URL and publishable key.
* Student: type the college email, then the code. First time: fill in the profile.
* Staff / admin: type the mobile number from step 2, then the code sent to their email.
* Demo outside laundry hours: log in as admin, open **Hostels & semesters** and press **Switch rule OFF for demo**.

## Deploying
Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (publishable key) as environment variables on Vercel/Netlify,
then redeploy. In Supabase -> Authentication -> URL Configuration add your site address.
