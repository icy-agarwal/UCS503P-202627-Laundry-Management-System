# Week 3

## Work Done

- Built the **Admin app** in the same Expo codebase, with its own navigation and a layout that is only available to the admin role.
- Implemented the admin screens:
  - **Dashboard** with an overview of requests by stage, pending complaints and activity.
  - **Batches** list with filters, and a detailed batch view.
  - **Complaints** list and complaint details, with the actions to add a note, advance, escalate or send a complaint back.
  - **Students** list with search, and a student detail screen where the admin can change a student's hostel or activate or deactivate the account.
  - **Staff** management screen to add staff members with name, mobile number, email and hostel, and to activate or deactivate them.
  - **Hostels and semesters** screen to add hostels and manage the laundry rules, including a switch that turns the counter-hours rule off for demonstrations.
  - **Categories** screen to add laundry item categories and turn them on or off, plus the list of item conditions.
  - **Audit log** screen showing who did what and when, with the old and new status of each action.
  - **Reports** screen with summaries computed from the batch list.
- Added shared admin building blocks so the tables, filters and detail views look the same across all screens.
- Reused the mock API layer for the admin screens so they worked with sample data before the real database was connected.
- Reviewed the three roles together (student, staff, admin) to make sure a request created by a student can be followed all the way through staff actions and appears correctly in the admin views.

## Learning

Learned how to design administration screens: lists with search and filters, detail views with actions, and an audit trail that makes every change traceable. Learned how much of the quality of an admin tool depends on the data model, for example keeping hostels, categories and rules in tables instead of hard-coding them in the app.

Also learned how a shared **TypeScript** type for the API helps in a larger project: changing it shows immediately which screens are affected.

## Challenges Faced

- Showing a lot of information (batches, complaints, audit entries) in a way that stays readable on both a laptop browser and a phone.
- Deciding which actions only the admin should have, compared with the staff member's actions.
- Keeping the number of screens manageable while still covering every item in the requirements.
- Making demo-friendly options, such as turning the counter-hours rule off, without weakening the real rules.

## Next Steps

- Replace the mock data with the real **Supabase** database.
- Add the missing tables, columns and SQL functions needed by the staff and admin screens.
- Move the business rules (roles, hostel isolation, status order, laundry days and counter hours) into the database.
- Create the staff and admin accounts and a login flow for them.
