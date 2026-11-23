---
description: Run one Mini-Jira backlog mission, from a new branch to a QA-tested pull request
argument-hint: <STORY-ID, for example AUTH-1>
disable-model-invocation: true
---

Run Mini-Jira mission **$ARGUMENTS**.

You are the coordinator. The agents do the work, and the project owner makes the final decision.

## Rules

- `BE` tasks go to `backend-developer`, `FE` tasks to `frontend-developer`, and `QA` tasks to `qa-engineer`. One exception: on a code mission with a **light** QA check, the `QA` tasks that write tests go to the developer agent instead: API/integration tests to `backend-developer`, E2E tests to `frontend-developer`. `QA` test tasks go to `qa-engineer` only when the mission gets a **full** QA check. Step 5 explains how to find the level. A task with several owners, such as `You + BE + FE`, is split: agents do their parts, and the `You` part is reported to the project owner. Don't write application code yourself.
- Only one agent changes the branch at a time. Agents commit but never push. You push.
- Never do a task owned by `You`, and never tick a `You` task unless the project owner says it's done.
- **Never force-push** any branch, and never push to `main` or `dev` except for an approved merge in step 7.
- **Merge only after the project owner explicitly approves that pull request.** An approval for one pull request never covers another.
- Follow `CLAUDE.md` and `docs/engineering-standards.md`. If anything is unclear, blocked, or contradictory, stop and ask the project owner.

## 1. Check that the mission can start

1. Run `git fetch origin` first, so every check uses current data.
2. Read the backlog from `dev`, not from the local folder: `git show origin/dev:docs/backlog.md`. Also read `CLAUDE.md`, the mission, and the related parts of the requirements, architecture, and wireframes.
3. Find the mission's GitHub issue in `OrelTzarfaty/Mini-Jira`: its title starts with `<STORY-ID> ·`, for example `SETUP-1 ·`.

**GitHub is the source of truth for progress.** A mission is **done** when its issue is closed. Its work is **merged** when a merged pull request into `dev` has `(<STORY-ID>)` in its title, with the brackets, so `SETUP-1` doesn't match `SETUP-10`.

The **current sprint** is the lowest sprint that still has an open mission with tasks for agents.

Stop and explain the problem if:

- no story ID was given, or the story isn't in the backlog
- the mission's issue is already closed
- a mission listed under "Depends on" is neither done nor merged
- the mission is in a later sprint than the current sprint, unless the project owner confirms they want it now
- the mission has no tasks for agents, or a `You` task must be finished before the agents can start
- a task needs something that isn't in `dev` yet, for example a browser test before the Playwright setup (SETUP-9) exists
- the mission includes work listed under "Pending the mentor's OK" in `CLAUDE.md`
- the working tree has uncommitted changes

**If the mission already has an open pull request**, don't start over. Tell the project owner, and continue from step 5 only if they ask you to.

## 2. Prepare the branch

1. Choose the branch type: `feat` for new features, `fix` for bug fixes, and `chore` for setup, tooling, and process work.
2. Create the branch without tracking `dev`:
   `git switch --no-track -c <type>/<STORY-ID>-<short-name> origin/dev`
3. In the first commit, set this mission's status in `docs/backlog.md` to in progress. In the same commit, bring earlier merged missions up to date: tick only the agent tasks that were merged, leave `You` tasks unticked unless the project owner confirmed them, and update their status lines and the Features table in `CLAUDE.md`.
4. Move the issue to **In Progress** on GitHub Project 1.

## 3. Build the mission

Before building, decide the expected QA level with the rules in step 5, because it decides who writes the `QA` test tasks (see **Rules**). Tell the developer agents when they must write those tests.

Work through the mission's tasks in dependency order. Keep briefs short: point agents to the exact backlog section and files instead of pasting long background. Give each agent:

- the story ID, its acceptance criteria, and its exact tasks
- the branch name and the files or wireframes to follow
- these instructions: make one commit per task, include the story ID in each commit message, run the checks, and don't push or merge

After each agent finishes, check its report and the commits before starting the next agent.

## 4. Open the pull request

1. Confirm that the last agent's report shows a clean `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run format:check` all passing on the final commit. Don't run them again yourself: CI runs them on the pull request, and QA checks the CI result. Run them yourself only if the report is unclear or the agent couldn't run them.
2. **If a check fails**, send the failure to the agent that owns that code, have it fix the root cause, and run all the checks again.
3. Make sure `CLAUDE.md`, the API docs, and `docs/backlog.md` are up to date.
4. Push with `git push -u origin HEAD`.
5. Open a pull request into `dev`. Use the pull request template, put the story ID in brackets at the end of the title, add `Refs #<issue>`, and add the mission's labels.

## 5. Run the QA check

Start `qa-engineer` with the pull request link, the exact final commit, the mission's story ID, and the QA level:

- **light** if the pull request changes only Markdown (`.md`) files. It gets no label and doesn't count.
- **full** if this is the 5th code pull request: at least 4 merged pull requests into `dev` labelled `qa:light` **or** `qa:standard` were merged after the most recently merged one labelled `qa:full`. Also full when the project owner asks for it. Label: `qa:full`.
- **light** for every other code pull request. Label: `qa:light`.

`qa:standard` is the label of the old standard level, which was removed on 2026-11-23. It stays in the count, so pull requests that already have it still count.

Check the changed files with `git diff --name-only --no-renames origin/dev...<final-commit>`. Without `--no-renames`, a file renamed to `.md` hides its old name. To count, find the merge time of the most recently merged `qa:full` pull request (`gh pr list --base dev --state merged --label qa:full --json mergedAt --jq 'max_by(.mergedAt).mergedAt'`; the list is sorted by creation date, not merge date, so don't use `--limit 1`). Then count the pull requests merged after it, once for each label, and add the two numbers:

- `gh pr list --base dev --state merged --label qa:light --search "merged:><time>" --json number`
- `gh pr list --base dev --state merged --label qa:standard --search "merged:><time>" --json number`

Run them as two separate queries: `gh` with two `--label` flags lists only pull requests that have **both** labels.

Count again right before you start QA. In step 3 you counted before this pull request existed, and other pull requests may have been merged since. If the new count gives full, use full. You may raise the level to full, but never lower it.

Add the level's label (`qa:light` or `qa:full`) to the pull request; Markdown-only pull requests get no label. The label must match the check the pull request really got: if the level is raised to full (by the new count, by `qa-engineer`, or by the project owner), remove `qa:light` and add `qa:full`, so the count starts again from this pull request. The levels are described in `.claude/agents/qa-engineer.md`.

- **PASS:** continue to step 6.
- **FAIL:** send the findings to the owning agent, have it fix the root cause, push the fix yourself, and ask `qa-engineer` for a **re-check after a fix** on the new commit: it tests only the fix, not the whole check again.
- **A finding fixed after a PASS** (with the owner's OK) gets the same re-check after a fix.
- After **3 failed QA rounds**, stop and report the remaining problems.

## 6. Report and ask

Before you report, confirm both of these, or go back to step 5:

- **The pull request's head commit is exactly the commit QA passed.** Any newer commit, including tests added by QA, needs a new QA check (a re-check after a fix is enough when only a fix was added).
- **CI is green** on that commit (`gh pr checks <number>`). If the repository has no CI yet, say so.

Update the pull request description if it no longer matches the work. Then tell the project owner, in simple English:

- the pull request link
- the QA verdict, its level (light or full, plus any re-check after a fix), and the commit it tested
- the CI result
- what was built
- every open QA finding, including Medium and Low ones
- what couldn't be tested
- any `You` tasks that are left

Then ask whether to merge this pull request. **Do not merge until the project owner approves.**

## 7. Merge after approval

Only after the project owner approves this pull request:

1. Run `git fetch origin`, then confirm the pull request's head commit is still the one QA passed.
2. Confirm `git config user.email` ends in `@users.noreply.github.com`, so the project owner's personal email never appears in the public history.
3. **If `dev` has moved on** since the branch was created (`git merge-base --is-ancestor origin/dev <qa-commit>` fails), don't merge yet. Merge `origin/dev` into the mission branch, push it, go back to step 5 for a new QA check, and ask for approval again.
4. Merge in a temporary working copy, so locked files in the project folder can't break it:
   1. `git worktree add --detach <temp-folder> origin/dev`, and run the next steps inside `<temp-folder>`
   2. `git merge --no-ff <qa-commit> -m "Merge pull request #<number> from OrelTzarfaty/<branch>"`
   3. Confirm the merged files are identical to the QA-passed commit: `git rev-parse HEAD^{tree}` must equal `git rev-parse <qa-commit>^{tree}`. If they differ, stop and ask the project owner.
   4. `git push origin HEAD:refs/heads/dev`
   5. Leave the folder, run `git worktree remove <temp-folder>`, then confirm GitHub shows the pull request as merged.

   If `dev` refuses the push, stop and ask the project owner. Don't use another merge method that would show their personal email.
5. In the GitHub issue, tick the agent tasks that were merged. Record the same ticks in `docs/backlog.md` in the next mission's first commit.
6. **If every task box in the issue is now ticked**, close the issue and move it to **Done** on GitHub Project 1.
7. **If any task is still open**, for example a `You` task, keep the issue open and **In Progress**, and tell the project owner what is left.
