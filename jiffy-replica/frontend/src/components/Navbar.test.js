const fs = require('fs');
const path = require('path');

describe('Navbar SuperAdmin team menu', () => {
  const source = fs.readFileSync(path.join(__dirname, 'Navbar.js'), 'utf8');

  test('shows admin invitations in the SuperAdmin management group', () => {
    const superAdminGroup = source.slice(
      source.indexOf('{isSuperAdmin && ('),
      source.indexOf('Manage Homeowners')
    );

    expect(superAdminGroup).toContain('href="/admin/invitations"');
    expect(superAdminGroup).toContain('Admin Invitations');
  });
});
