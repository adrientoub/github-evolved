export const GITHUB_MATCHES = ['https://github.com/*', 'https://*.ghe.com/*'];

export function createManifest(version: string): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: 'GitHub PR Review 2.0',
    description: 'Improves the GitHub pull request review experience.',
    version,
    host_permissions: GITHUB_MATCHES,
    content_scripts: [
      {
        matches: GITHUB_MATCHES,
        js: ['content.js'],
        run_at: 'document_idle',
      },
    ],
  };
}
