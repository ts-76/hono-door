const packages = ['packages/hono-door', 'packages/hono-door-ui']

export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ...packages.map((pkgRoot) => [
      '@semantic-release/npm',
      {
        pkgRoot,
        npmPublish: true,
      },
    ]),
    [
      '@semantic-release/github',
      {
        addReleases: 'bottom',
      },
    ],
  ],
}
