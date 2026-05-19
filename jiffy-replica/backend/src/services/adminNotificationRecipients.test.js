describe('admin notification recipients', () => {
    const originalEnv = process.env.ADMIN_NOTIFICATION_EMAILS;

    afterEach(() => {
        process.env.ADMIN_NOTIFICATION_EMAILS = originalEnv;
        jest.resetModules();
    });

    test('includes Dave by default', async () => {
        delete process.env.ADMIN_NOTIFICATION_EMAILS;
        const { getAdminNotificationRecipients } = require('./adminNotificationRecipients');

        const supabaseClient = {
            from: jest.fn()
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    then: (resolve) => resolve({ data: [], error: null }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
        };

        await expect(getAdminNotificationRecipients({ supabaseClient })).resolves.toEqual([
            'dave@bridgeworkservices.com',
        ]);
    });

    test('merges env, admin, settings, deduplicates, and filters invalid emails', async () => {
        process.env.ADMIN_NOTIFICATION_EMAILS = 'Dave@BridgeWorkServices.com, ops@example.com, invalid';
        const { getAdminNotificationRecipients } = require('./adminNotificationRecipients');

        const supabaseClient = {
            from: jest.fn()
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    then: (resolve) => resolve({
                        data: [
                            { email: 'ADMIN@example.com' },
                            { email: 'ops@example.com' },
                            { email: '' },
                        ],
                        error: null,
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    maybeSingle: jest.fn().mockResolvedValue({
                        data: { value: JSON.stringify(['extra@example.com', 'admin@example.com', 'bad']) },
                        error: null,
                    }),
                }),
        };

        await expect(getAdminNotificationRecipients({ supabaseClient })).resolves.toEqual([
            'admin@example.com',
            'ops@example.com',
            'extra@example.com',
            'dave@bridgeworkservices.com',
        ]);
    });
});
