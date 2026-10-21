# Contributing to tempesta-browser-extension

## Development Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make the changes with conventional commit messages
4. Push and open a Pull Request

## Pull Request Requirements

### PR Title Format

PR titles must follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification, since the title becomes the squash commit message and drives
the version bump:

```
feat: add tag editing
fix: keep focus in the finder on pages with modal dialogs
docs: update installation guide
feat!: change the native messaging protocol
```

- `feat!:` or `fix!:` (breaking change): major version bump
- `feat:`: minor version bump
- everything else (`fix:`, `perf:`, `security:`, `docs:`, `style:`,
  `refactor:`, `test:`, `chore:`): patch version bump

### Code Quality Requirements

All PRs must pass the automated checks:

- Type check: `npm run typecheck`
- Tests: `npm test`
- Build and lint: `npm run build && npm run lint`

### Branch Configuration

- Target branch: `master`
- Merge strategy: squash merging (the PR title becomes the commit message)
- Status checks must pass before merging

## Development Environment

```bash
git clone https://github.com/YOUR_USERNAME/tempesta-browser-extension.git
cd tempesta-browser-extension
npm ci
npm run build
scripts/dev-run firefox   # or chromium
```

`scripts/dev-run` requires `tempesta` with the `native-host` command.

## Automated Release Process

Upon merge to `master`:

1. `release-on-merge.yml` derives the version bump from the PR title, commits
   it (`chore(release): release vX.Y.Z`) and pushes the `vX.Y.Z` tag
2. `publish.yml` runs on the tag: it builds the packages, creates the GitHub
   release and submits the new version to the Chrome Web Store and to
   addons.mozilla.org, where it goes live after review
