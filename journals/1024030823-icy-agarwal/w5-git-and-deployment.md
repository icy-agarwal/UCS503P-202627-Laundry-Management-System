# Week 5

## Work Done

- Replaced the old placeholder frontend in `code/frontend` of the team repository with the final **Expo** frontend (student, staff and admin), and pushed it to the `main` branch with Git.
- Understood the structure of the repository: it is a fork of the course template, with a default branch and several working branches (`main`, `master`, and one for each team member).
- Deployed the web version of the app on **Vercel**:
  - imported the GitHub repository,
  - set the root directory to `code/frontend`,
  - set the build command to `npx expo export --platform web` and the output directory to `dist`,
  - added the Supabase URL and publishable key as environment variables,
  - changed the default branch of the repository to `main`, because Vercel builds the default branch.
- Fixed a failed first build. The error was "Unable to resolve module ../../lib/nav". The cause was that the repository-level `.gitignore` (from the Python template) ignores every folder named `lib`, so `src/lib` was never uploaded. Compared the files on GitHub with the local project, found the two missing files, added them with `git add -f`, pushed again, and the build became **Ready**.
- Got the app live on a Vercel address and confirmed that the sign-in page loads from a phone as well as a computer.
- Investigated why other people could not open the link: Vercel's deployment protection asks visitors to log in to Vercel on some of the addresses. Identified the main production address that should be shared and the setting that controls this.
- Coordinated with a teammate who had a newer frontend version on her laptop:
  - she created a new branch `riddhi-final` from the latest `main` and pushed her version,
  - compared her branch with `main` and confirmed that the file set is identical and that only four files differ (a redesigned login page with student and staff tabs, and a profile screen that shows the semester and admission year),
  - opened **pull request #2** from `riddhi-final` into `main`, after correcting the pull request so that it targets our own repository and not the original course template. The checks passed and there were no conflicts.
- Saved a reference list of all staff and admin accounts with their hostel, mobile number and the email that receives the login code.

## Learning

Learned the full path from a local project to a live website: Git commit and push, a hosting service that builds from a branch, and environment variables that are added at build time. Learned how forks and pull requests work, and why the base repository and branch of a pull request must always be checked.

Also learned how `.gitignore` rules from a parent folder can silently hide source files, and how to find the difference between what is on a computer and what is on GitHub.

## Challenges Faced

- The first Vercel import tried to build the wrong branch and detected the wrong kind of project.
- The build error that appeared only on Vercel and not on the local computer.
- Working with an existing repository and a team: replacing old files safely, avoiding the upload of `.env` and `node_modules`, and keeping a teammate's version separate until it was reviewed.
- Pull requests defaulting to the course template repository instead of our own.
- Making the live link usable by people who are not logged in to Vercel.
