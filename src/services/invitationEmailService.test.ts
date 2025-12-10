import { sendInvitationEmail } from './invitationEmailService';

// Mock the global fetch function
global.fetch = jest.fn();

describe('invitationEmailService', () => {
    const mockEmail = 'test@example.com';
    const mockFullName = 'Test User';
    const mockRole = 'admin';
    const mockToken = 'test-token';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NEXT_PUBLIC_APP_URL = 'http://test-app.com';
    });

    test('should send invitation email successfully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        const result = await sendInvitationEmail(mockEmail, mockFullName, mockRole, mockToken);

        expect(global.fetch).toHaveBeenCalledWith(
            'https://seobrand.app.n8n.cloud/webhook/send-invitation',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: expect.stringContaining(mockEmail),
            })
        );
        expect(result).toEqual({ success: true });
    });

    test('should throw error when webhook fails', async () => {
        // Mock console.error to suppress expected error output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Webhook error' }),
        });

        await expect(
            sendInvitationEmail(mockEmail, mockFullName, mockRole, mockToken)
        ).rejects.toThrow('Webhook error');

        // Restore console.error
        consoleSpy.mockRestore();
    });

    test('should use default app url if env not set', async () => {
        delete process.env.NEXT_PUBLIC_APP_URL;
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        await sendInvitationEmail(mockEmail, mockFullName, mockRole, mockToken);

        // Check the body to ensure localhost is used
        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('http://localhost:3000'),
            })
        );
    });
});
