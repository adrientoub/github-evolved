import { createManifest } from './manifest';

describe('createManifest', () => {
  it('only targets github.com and *.ghe.com', () => {
    const manifest = createManifest('0.0.1');
    const expected = ['https://github.com/*', 'https://*.ghe.com/*'];
    expect(manifest.host_permissions).toEqual(expected);
    expect(manifest.content_scripts?.[0].matches).toEqual(expected);
    expect(manifest.permissions).toBeUndefined();
  });
});
