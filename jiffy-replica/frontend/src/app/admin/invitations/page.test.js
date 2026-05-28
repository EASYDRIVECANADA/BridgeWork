const fs = require('fs');
const path = require('path');

describe('AdminInvitationsPage auth guard', () => {
  const pageSource = fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8');

  test('waits for auth initialization before redirecting away', () => {
    expect(pageSource).toContain('authInitialized');
    expect(pageSource).toContain('if (!authInitialized) return;');
  });

  test('includes guest quotes in selectable admin permissions', () => {
    const permissionsBlock = pageSource.match(/const ALL_PERMISSIONS = \[[\s\S]*?\];/);

    expect(permissionsBlock?.[0]).toContain("key: 'guest_quotes'");
    expect(permissionsBlock?.[0]).toContain("label: 'Guest Quotes'");
  });

  test('direct admin creation validates the same password rules as the backend', () => {
    expect(pageSource).toContain('directFormData.password.length < 8');
    expect(pageSource).toContain('Password must be at least 8 characters');
    expect(pageSource).toContain('Password must contain at least one uppercase letter, one number, and one special character');
  });

  test('direct admin creation refreshes admin accounts after success', () => {
    const directCreateHandler = pageSource.match(/const handleDirectCreate = async[\s\S]*?^\s{2}\};/m);

    expect(directCreateHandler?.[0]).toContain("toast.success('Admin account created successfully! They can now log in.')");
    expect(directCreateHandler?.[0]).toContain('fetchInvitations();');
  });
});
