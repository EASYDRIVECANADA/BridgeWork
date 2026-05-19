const CUSTOM_COMMISSION_ERROR = 'Enter a custom commission between 1% and 50%';

function getAdminProPasswordValidationError(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

function normalizeCommissionRate({ commissionRate, customCommission, useCustomRate }) {
  if (useCustomRate) {
    const customPercent = parseFloat(customCommission);
    if (!Number.isFinite(customPercent) || customPercent <= 0 || customPercent > 50) {
      return { value: null, error: CUSTOM_COMMISSION_ERROR };
    }
    return { value: parseFloat((customPercent / 100).toFixed(4)), error: null };
  }

  const presetRate = parseFloat(commissionRate);
  if (!Number.isFinite(presetRate) || presetRate < 0 || presetRate > 1) {
    return { value: null, error: 'Select a valid commission rate' };
  }
  return { value: presetRate, error: null };
}

module.exports = {
  CUSTOM_COMMISSION_ERROR,
  getAdminProPasswordValidationError,
  normalizeCommissionRate,
};
