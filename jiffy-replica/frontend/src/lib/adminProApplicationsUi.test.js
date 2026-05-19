const {
  getFilterAfterAdminCreateProSuccess,
  getAdminPermissionDenialMessage,
} = require('./adminProApplicationsUi');

describe('admin pro application UI helpers', () => {
  test('shows newly added pros in the approved filter after creation', () => {
    expect(getFilterAfterAdminCreateProSuccess()).toBe('approved');
  });

  test('explains missing pro application permission', () => {
    expect(getAdminPermissionDenialMessage('pro_applications')).toBe(
      'You do not have permission to review pro applications. Ask a SuperAdmin to enable Pro Applications access for your admin account.'
    );
  });
});
