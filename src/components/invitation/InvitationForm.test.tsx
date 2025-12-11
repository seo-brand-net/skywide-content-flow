import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationForm } from './InvitationForm';
import '@testing-library/jest-dom';

describe('InvitationForm', () => {
    const mockOnSubmit = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders form fields correctly', () => {
        render(<InvitationForm onSubmit={mockOnSubmit} isSubmitting={false} />);

        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Role select
        expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
    });

    test('allows user to fill out the form', async () => {
        const user = userEvent.setup();
        render(<InvitationForm onSubmit={mockOnSubmit} isSubmitting={false} />);

        await user.type(screen.getByLabelText(/full name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');

        // Select role (default is user, but let's try to verify interaction if possible)
        // Radix UI Select is tricky to test with simple userEvent, sometimes requires pointer interactions
        // For basic verification, we check values are being typed.
        expect(screen.getByLabelText(/full name/i)).toHaveValue('John Doe');
        expect(screen.getByLabelText(/email address/i)).toHaveValue('john@example.com');
    });

    test('calls onSubmit with correct data when form is submitted', async () => {
        const user = userEvent.setup();
        render(<InvitationForm onSubmit={mockOnSubmit} isSubmitting={false} />);

        await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
        await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');

        // Submit
        await user.click(screen.getByRole('button', { name: /send invitation/i }));

        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith({
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            role: 'user' // Default value
        });
    });

    test('disables submit button when isSubmitting is true', () => {
        render(<InvitationForm onSubmit={mockOnSubmit} isSubmitting={true} />);

        const button = screen.getByRole('button', { name: /sending.../i });
        expect(button).toBeDisabled();
    });

    test('clears form after submission', async () => {
        // This relies on the component implementing the reset logic
        // The component does `setFormData` after `await onSubmit(formData)`
        // However, in the unit test, mockOnSubmit resolves immediately.

        const user = userEvent.setup();
        render(<InvitationForm onSubmit={mockOnSubmit} isSubmitting={false} />);

        const nameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);

        await user.type(nameInput, 'Reset Tester');
        await user.type(emailInput, 'reset@example.com');

        await user.click(screen.getByRole('button', { name: /send invitation/i }));

        await waitFor(() => {
            expect(nameInput).toHaveValue('');
            expect(emailInput).toHaveValue('');
        });
    });
});
