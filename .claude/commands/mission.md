---
description: Run one Mini-Jira backlog mission, from a new branch to a QA-tested pull request
argument-hint: <STORY-ID, for example AUTH-1>
disable-model-invocation: true
---

Run Mini-Jira mission **$ARGUMENTS**.

You are the coordinator. The agents do the work, and the project owner makes the final decision.

## Rules

- `BE` tasks go to `backend-developer`, `FE` tasks to `frontend-developer`, and `QA` tasks to `qa-engineer`. A task with several owners, such as `You + BE + FE`, is split: agents do their parts, and the `You` part is reported to the project owner. Don't write application code yourself.
- Only one agent changes the branch at a time. Agents commit but never push. You push.
- Never do a task owned by `You`.
- **Never force-push** any branch, and never push to `main` or `dev` except for an approved merge in step 7.
- **Merge only after the project owner explicitly approves that pull request.** An approval for one pull request never covers another.
- Follow `CLAUDE.md` and `docs/engineering-standards.md`. If anything is unclear, blocked, or contradictory, stop and ask the project owner.

## 1. Check that the mission can start

1. Run `git fetch origin` first, so every check uses current data.
2. Read `CLAUDE.md`, the mission in `docs/backlog.md`, and the related parts of the requirements, architecture, and wireframes.
3. Find the mission's GitHub issue in `OrelTzarfaty/Mini-Jira`: its title starts with `<STORY-ID> ·`, for example `SETUP-1 ·`.

**GitHub is the source of truth for progress.** A mission is done when its issue is closed. A mission is merged when a pull request with its story ID in the title is merged into `dev`.

Stop and explain the problem if:

- no story ID was given, or the story isn't in the backlog
- the mission's issue is already closed
- a mission listed under "Depends on" has no merged pull request in `dev`
- the mission isn't next in sprint order, and the project owner hasn't asked for it
- the mission has no tasks for agents, or a `You` task must be finished before the agents can start
- a task needs something that isn't in `dev` yet, for example a browser test before the Playwright setup (SETUP-9) exists
- the mission includes work listed under "Pending the mentor's OK" in `CLAUDE.md`
- the working tree has uncommitted changes

**If the mission already has an open pull request**, don't start over. Tell the project owner, and continue from step 5 only if they ask you to.

**If an earlier mission is merged but its boxes aren't ticked** in `docs/backlog.md`, tick them and update its status line in this mission's first commit.

## 2. Prepare the branch

1. Choose the branch type: `feat` for new features, `fix` for bug fixes, and `chore` for setup, tooling, and process work.
2. Create the branch without tracking `dev`:
   `git switch --no-track -c <type>/<STORY-ID>-<short-name> origin/dev`
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
2. **If a check fails**, send the failure to the agent that owns that code, have it fix the root cause, and run all the checks again.
3. Make sure `CLAUDE.md`, the API docs, and `docs/backlog.md` are up to date.
4. Push with `git push -u origin HEAD`.
5. Open a pull request into `dev`. Use the pull request template, put the story ID in the title, add `Refs #<issue>`, and add the mission's labels.

## 5. Run the QA check

Start `qa-engineer` with the pull request link, the exact final commit, and the mission's story ID.

- **PASS:** continue to step 6.
- **FAIL:** send the findings to the owning agent, have it fix the root cause, push the fix yourself, and run the QA check again on the new commit.
- After **3 failed QA rounds**, stop and report the remaining problems.

## 6. Report and ask

Before you report, confirm both of these, or go back to step 5:

- **The pull request's head commit is exactly the commit QA passed.** Any newer commit, including tests added by QA, needs a new QA check.
- **CI is green** on that commit (`gh pr checks <number>`). If the repository has no CI yet, say so.

Then tell the project owner, in simple English:

- the pull request link
- the QA verdict and the commit it tested
- the CI result
- what was built
- every open QA finding, including Medium and Low ones
- what couldn't be tested
- any `You` tasks that are left

Then ask whether to merge this pull request. **Do not merge until the project owner approves.**

## 7. Merge after approval

Only after the project owner approves this pull request:

1. Confirm again that the head commit is the one QA passed.
2. Merge it into `dev` using the project owner's private commit email, then confirm GitHub shows the pull request as merged.
3. **If every task box in the mission is ticked**, close the issue and move it to **Done** on GitHub Project 1.
4. **If any task is still open**, for example a `You` task, keep the issue open and **In Progress**, and tell the project owner what is left.
