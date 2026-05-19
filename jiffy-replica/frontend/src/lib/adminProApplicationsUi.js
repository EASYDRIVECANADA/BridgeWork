function getFilterAfterAdminCreateProSuccess() {
  return 'approved';
}

function getAdminPermissionDenialMessage(permissionKey) {
  if (permissionKey === 'pro_applications') {
    return 'You do not have permission to review pro applications. Ask a SuperAdmin to enable Pro Applications access for your admin account.';
  }
  return 'You do not have permission to access this page.';
}

module.exports = {
  getAdminPermissionDenialMessage,
  getFilterAfterAdminCreateProSuccess,
};
