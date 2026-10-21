# Instructions for AI agents

This repository is maintained largely with AI assistants. These rules apply to any agent that changes it.

## Proposing changes

- Work on a branch and open a pull request. Do not push directly to `main`.
- Every pull request runs [rsp](https://github.com/fedeveloper/rsp) (`.github/workflows/rsp.yml`), which comments reproducible facts about the diff: skipped or deleted tests, imports of packages missing from `package.json`, environment variables missing from `.env.example`, disabled checks.
- Before calling a PR ready, read the rsp comment. For each fact it reports, either fix the change or explain in the PR description why it is intended. Do not work around the signal (for example by moving code or renaming tests).

## Dependencies and configuration

- Every package imported by `server.js`, `services/` or `src/` must be declared in `package.json`, and `package-lock.json` must be updated with `npm install`, not by hand.
- Every new `process.env` variable must be added to `.env.example` with a safe default.

## Tests

- Run `npm test` (Node's built-in test runner, files in `test/`). CI runs it, plus `npm run build`, on every PR.
- When you change the `.dek` parser, price handling or `services/storage.js`, add or update tests.
- Never delete, skip or weaken a test to make it pass. If a test is wrong, fix it and say why in the PR.
- Tests must not touch the real `data/` folder; see `test/storage.test.js` for how to use a temporary directory.

## Files not to commit

- `.env`, the user's collection (`*.dek`) and the runtime files in `data/` other than `custom_links.json` (see `.gitignore`).
