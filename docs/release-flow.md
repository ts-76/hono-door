# Release Flow

Package releases are automated from `main` with semantic-release.

Use a Conventional Commit title for the final commit that lands on `main`. This includes pull request squash merge titles. Release-triggering prefixes are:

- `feat:`
- `fix:`
- `perf:`

The current release configuration maps those prefixes to the next `0.x.0` minor release. A non-Conventional squash title can merge successfully but still produce no npm release.

When a release should be published after a non-Conventional merge, add a small follow-up commit with a release-triggering Conventional Commit title and let the `Release` workflow run from `main`.
