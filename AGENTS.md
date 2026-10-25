<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Owner's GitHub workflow

After every completed logical change, including small fixes and documentation changes:
- Update the application version in package.json and package-lock.json (patch for small changes, minor for new features).
- Add a concise dated CHANGELOG.md entry describing the resulting behavior and relevant validation.
- Run checks appropriate to the change, commit with a descriptive message, and push the current working branch to origin.
- Include the version in each release commit title. In the commit body, summarize what changed, relevant validation, and remaining limitations; maintain the matching dated CHANGELOG.md entry. Do not rewrite already-pushed version history to add this detail retroactively.
- Create and push the matching annotated version tag after checks pass. Do not overwrite existing tags or force-push.
- Keep credentials, local environment files, database exports, and personal account data out of Git.
- Report the version and GitHub link. If pushing fails, preserve the commit and explain the blocker.
This is standing owner authorization for these routine commit, version, tag, and push steps; no repeated permission question is needed.
