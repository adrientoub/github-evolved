import { createManifest } from './manifest';

describe('createManifest', () => {
  it('only targets github.com and *.ghe.com', () => {
    const manifest = createManifest('0.0.1');
    const expected = ['https://github.com/*', 'https://*.ghe.com/*'];
    expect(manifest.name).toBe('GitHub Evolved');
    expect(manifest.icons).toEqual({
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    });
    expect(manifest.host_permissions).toEqual(expected);
    expect(manifest.content_scripts?.[0].matches).toEqual(expected);
    expect(manifest.permissions).toBeUndefined();
  });
});
