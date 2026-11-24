# API contract the frontend expects

Base URL = `EXPO_PUBLIC_API_URL` + `/api`. Every request except `/auth/*` sends `Authorization: Bearer <access_token>`.
Errors: any non-2xx with JSON `{ "error": "human readable message" }` (the message is shown to the user as-is).
**The server decides what each role may see**: students get only their own rows, staff only their hostel's, admin everything.
All types are in `src/api/types.ts`; the in-memory demo in `src/api/mock.ts` is a runnable reference of the rules below.

| Method & path | Role | Body / query | Returns |
|---|---|---|---|
| POST `/auth/send-otp` | public | `{email}` | 200 (already built) |
| POST `/auth/verify-otp` | public | `{email, otp, token}` (both names sent) | `{session:{access_token}}` or `{access_token}` (already built, shape assumed) |
| GET `/me` | any | – | `Me` (`role`, `name`, `email`; students also `profile`, `enrollment`; staff `hostelId`) |
| PUT `/me/profile` | student | `{name, gender, hostelId, room, phone}` | `Me`. Creates the Student + Hostel + Semester enrollment; a changed hostel ends the old enrollment and starts a new one (history is never overwritten) |
| POST `/me/renew` | student | – | `Me` (Pending renewal -> Active) |
| GET `/config` | any | – | `{hostels, semesters, categories, conditions}` |
| GET `/batches` | any | `?status=A,B&search=` | `Batch[]` newest first |
| GET `/batches/:id` | any | `:id` = request id (LR-1042) or batch id (L-1042) | `Batch` |
| POST `/batches` | student | `{items:{Shirts:3}, remark}` | `Batch` in `WAITING_FOR_VERIFICATION`. Server must check enrollment is Active and counter hours |
| POST `/batches/:rid/verify` | staff | `{items, conditions:[{c,k}], remark}` | `Batch` -> `AWAITING_TAGGING`. Keep `original` (student's entry) untouched; audit every changed category |
| POST `/batches/:rid/reject` | staff | `{reason}` | `Batch` -> `CANCELLED` |
| POST `/batches/:rid/batch-id` | staff | – | `Batch` with new `bid` (L-xxxx) |
| POST `/batches/transition` | staff | `{ids:[rid], to}` where `to` is `TAGGED`, `IN_LAUNDRY`, `RETURNED` or `READY_FOR_PICKUP` | `Batch[]`. Validate the state machine; `READY_FOR_PICKUP` creates the single-use pickup token |
| POST `/batches/:rid/delay-notice` | staff | – | 200 + student notification |
| GET `/batches/:rid/pickup` | student (owner) | – | `{token, code, used}` or `null` |
| POST `/pickup/lookup` | staff | `{code}` (QR text `hlp:<token>` or 6-digit code) | `{kind:'ok'\|'used', batch}` or `{kind:'invalid'}` (also invalid for another hostel's batch) |
| POST `/pickup/confirm` | staff | `{rid}` | `Batch` -> `COLLECTED`; token invalidated; 409 if already used. Must be atomic (single `UPDATE ... WHERE status='READY_FOR_PICKUP'`) |
| GET `/complaints`, GET `/complaints/:id` | any | – | `Complaint[]` / `Complaint` |
| POST `/complaints` | student | `{batchId, type, description}` | `Complaint` |
| POST `/complaints/:id/notes` | staff, admin | `{text}` | `Complaint` |
| POST `/complaints/:id/advance` | staff, admin | `{note?}` | `Complaint` (Open -> Under review -> Investigating -> Resolved -> Closed; resolving needs a note) |
| POST `/complaints/:id/escalate` | staff | – | `Complaint` (`escalated:true`) |
| POST `/complaints/:id/send-back` | admin | – | `Complaint` (`escalated:false`) |
| GET `/notifications`, POST `/notifications/read-all` | student | – | `Notification[]` / 200 |
| GET `/admin/students?search=` | admin | – | `StudentRec[]` |
| GET `/admin/students/:id` | admin | – | `StudentRec` |
| POST `/admin/students/:id/change-hostel` | admin | `{hostelId}` | `StudentRec` |
| PATCH `/admin/students/:id` | admin | `{active}` | `StudentRec` |
| GET `/admin/staff`, POST `/admin/staff` | admin | `{name,email,hostelId}` | `StaffRec[]` / `StaffRec` |
| PATCH `/admin/staff/:id` | admin | `{active}` | `StaffRec` |
| POST `/admin/hostels` | admin | `{name, group, days:[collectionDay, deliveryDay]}` | `Hostel` |
| POST `/admin/semesters` | admin | `{name, start, end}` (YYYY-MM-DD) | `{pending}` (closes current, creates Pending renewal enrollments) |
| POST `/admin/renewals/approve` | admin | – | `{approved: n}` |
| POST `/admin/categories`, POST `/admin/categories/:name/toggle` | admin | `{name}` | 200 |
| POST `/admin/conditions`, DELETE `/admin/conditions/:name` | admin | `{name}` | 200 |
| GET `/admin/audit?search=&role=` | admin | role = Student / Staff / Admin | `AuditEntry[]` newest first |

Dates are ISO strings (`submittedAt`, `filedAt`, ...) except `expectedOn` and semester dates, which are `YYYY-MM-DD`.
Statuses: `WAITING_FOR_VERIFICATION, AWAITING_TAGGING, TAGGED, IN_LAUNDRY, RETURNED, READY_FOR_PICKUP, COLLECTED, CANCELLED`.
