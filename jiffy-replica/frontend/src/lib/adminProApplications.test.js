const {
  getAdminProPasswordValidationError,
  normalizeCommissionRate,
} = require('./adminProApplications');

describe('admin pro application helpers', () => {
  describe('getAdminProPasswordValidationError', () => {
    test('requires the same password policy as the create-pro API', () => {
      expect(getAdminProPasswordValidationError('Pass1!')).toBe('Password must be at least 8 characters');
      expect(getAdminProPasswordValidationError('password1!')).toBe('Password must contain at least one uppercase letter');
      expect(getAdminProPasswordValidationError('Password!')).toBe('Password must contain at least one number');
      expect(getAdminProPasswordValidationError('Password1')).toBe('Password must contain at least one special character');
      expect(getAdminProPasswordValidationError('Password1!')).toBe(null);
    });
  });

  describe('normalizeCommissionRate', () => {
    test('returns preset decimal commission rates', () => {
      expect(normalizeCommissionRate({ commissionRate: '0.15', useCustomRate: false })).toEqual({
        value: 0.15,
        error: null,
      });
    });

    test('converts valid custom percentage input to decimal rates', () => {
      expect(normalizeCommissionRate({ customCommission: '17.5', useCustomRate: true })).toEqual({
        value: 0.175,
        error: null,
      });
    });

    test('rejects missing or out-of-range custom commission input', () => {
      expect(normalizeCommissionRate({ customCommission: '', useCustomRate: true })).toEqual({
        value: null,
        error: 'Enter a custom commission between 1% and 50%',
      });
      expect(normalizeCommissionRate({ customCommission: '0', useCustomRate: true })).toEqual({
        value: null,
        error: 'Enter a custom commission between 1% and 50%',
      });
      expect(normalizeCommissionRate({ customCommission: '51', useCustomRate: true })).toEqual({
        value: null,
        error: 'Enter a custom commission between 1% and 50%',
      });
    });
  });
});
