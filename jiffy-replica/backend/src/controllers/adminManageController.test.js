const fs = require('fs');
const path = require('path');

describe('adminManageController permission validation', () => {
    const source = fs.readFileSync(path.join(__dirname, 'adminManageController.js'), 'utf8');

    test('allows the guest quotes permission key when saving admin permissions', () => {
        const validKeysBlock = source.match(/const VALID_PERMISSION_KEYS = \[[\s\S]*?\];/);

        expect(validKeysBlock?.[0]).toContain("'guest_quotes'");
    });
});
