const fs = require('fs');
const path = require('path');

describe('AdminInvitationsPage auth guard', () => {
  const pageSource = fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8');

  test('waits for auth initialization before redirecting away', () => {
    expect(pageSource).toContain('authInitialized');
    expect(pageSource).toContain('if (!authInitialized) return;');
  });
});
