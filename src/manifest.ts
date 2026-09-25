export const GITHUB_MATCHES = ['https://github.com/*', 'https://*.ghe.com/*'];

export function createManifest(version: string): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: 'GitHub Evolved',
    description: 'Improves the GitHub pull request review experience.',
    version,
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
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
