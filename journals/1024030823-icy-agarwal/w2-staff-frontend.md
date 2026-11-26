# Week 2

## Work Done

- Planned the **Staff (laundry counter) app** around the real counter workflow: receive the clothes, verify the physical count, tag the batch, move it through washing, and hand it back using a pickup code.
- Built the staff screens in the **React Native Expo (Expo Router)** frontend:
  - **Home** dashboard with the day's counts and the laundry counter status.
  - **Queues** showing requests grouped by stage (waiting for verification, verified, washing, ready for pickup, and so on).
  - **Verify** screen to check the physical item count against what the student declared, add item conditions and remarks, or reject the request.
  - **Tag** screen to generate and attach a batch ID once a request is verified.
  - **Batch details** screen with the full request, status history and actions to move it to the next status.
  - **Scan** screen for the pickup QR, built with **expo-camera**, with a **6-digit backup code** entry for when the camera cannot be used.
  - **Complaints** list and complaint details, with notes and actions for the staff member.
  - **Search** screen to look up requests quickly.
  - **My profile** screen for the logged-in staff member.
- Set up **role-based routing** so that the role returned after login decides whether the user lands in the student, staff or admin part of the app.
- Created reusable UI components (cards, buttons, status chips, icons, staff-specific building blocks) and a shared theme hook so every screen follows the same design and supports dark mode.
- Built a **mock API layer** with the same interface as the real backend, so the staff screens could be developed and demonstrated with in-memory sample data before the database functions were ready. A **demo mode** with a fixed OTP was added for presentations.
- Added the laundry schedule rules in the interface: each hostel has two laundry days and the counter works in two time windows, with a lunch break in between. The screen tells the staff member when the counter is open or closed.
- Walked through the staff flow in the browser in demo mode: verify a request, tag it, move it through the stages and complete a pickup.

## Learning

Learned how to structure a role-based app with Expo Router, where folders map to routes and a layout file for each role controls navigation. Learned why putting every screen behind a single API interface is useful: the mock version and the real version can be swapped without changing any screen.

Also learned how a real operational workflow (verify, tag, wash, hand over) can be turned into a status-driven interface where each screen offers only the actions that are valid for the current status.

## Challenges Faced

- Keeping the staff interface fast to use for a person standing at a counter, with few taps per request.
- Handling the camera QR scanner across browser and phone, and providing a backup code so pickup is never blocked by a camera problem.
- Representing the schedule rules (laundry days, counter hours, lunch break) clearly instead of just showing an error when the counter is closed.
- Keeping the look of the staff app consistent with the student app built by teammates.

## Next Steps

- Build the **Admin** frontend: dashboard, batches, complaints, students, staff management, hostel and semester settings, categories, audit log and reports.
- Reuse the shared components and mock API layer for the admin screens.
- Start planning how the staff and admin actions will be connected to the real Supabase database.
