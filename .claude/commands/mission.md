---
description: Run one Mini-Jira backlog mission, from a new branch to a QA-tested pull request
argument-hint: <STORY-ID, for example AUTH-1>
disable-model-invocation: true
---

Run Mini-Jira mission **$ARGUMENTS**.

You are the coordinator. The agents do the work, and the project owner makes the final decision.

## Rules

- `BE` tasks go to `backend-developer`, `FE` tasks to `frontend-developer`, and `QA` tasks to `qa-engineer`. Don't write application code yourself.
- Only one agent changes the branch at a time.
- Never do a task owned by `You`. List those tasks in the final report.
- Never merge, force-push, or push directly to `main` or `dev`.
- Follow `CLAUDE.md` and `docs/engineering-standards.md`. If anything is unclear, blocked, or contradictory, stop and ask the project owner.

## 1. Check that the mission can start

Read `CLAUDE.md`, the mission in `docs/backlog.md`, and the related parts of the requirements, architecture, and wireframes.

Stop and explain the problem if:

- no story ID was given, or the story isn't in the backlog
- the mission is already done or already has an open pull request
- a mission listed under "Depends on" isn't merged into `dev`
- the working tree has uncommitted changes
- the mission includes work still waiting for the mentor's approval

Find the mission's GitHub issue in `OrelTzarfaty/Mini-Jira`. Its title starts with the story ID.

## 2. Prepare the branch

1. Run `git fetch origin`.
2. Create the branch from `origin/dev`: `<type>/<STORY-ID>-<short-name>`, using `feat`, `fix`, or `chore`.
3. Set the mission's status in `docs/backlog.md` to in progress, and commit that change.
4. Move the issue to **In Progress** on GitHub Project 1.

## 3. Build the mission

Work through the mission's tasks in dependency order. Give each agent:

- the story ID, its acceptance criteria, and its exact tasks
- the branch name and the files or wireframes to follow
- these instructions: make one commit per task, include the story ID in each commit message, run the checks, and don't push or merge

After each agent finishes, check its report and the commits before starting the next agent.

## 4. Open the pull request

1. Run a clean `npm ci`, then `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run format:check`.
2. Make sure `CLAUDE.md`, the API docs, and `docs/backlog.md` are up to date.
3. Push the branch.
4. Open a pull request into `dev`. Use the pull request template, put the story ID in the title, add `Refs #<issue>`, and add the mission's labels.

## 5. Run the QA check

Start `qa-engineer` with the pull request link, the exact final commit, and the mission's story ID.

- **PASS:** continue to step 6.
- **FAIL:** send the findings to the owning agent, have it fix the root cause, push the fix, and run the QA check again on the new commit.
- After **3 failed QA rounds**, stop and report the remaining problems.

Any code change after a PASS needs a new QA check.

## 6. Report and stop

Tell the project owner, in simple English:

- the pull request link
- the QA verdict and the commit it tested
- what was built
- what couldn't be tested
- any `You` tasks that are left

Then ask whether to merge. **Do not merge until the project owner approves.**

After an approved merge, close the issue, move it to **Done** on the board, and record the finished tasks in `docs/backlog.md` in the next mission's first commit.
