import { cn } from './utils';

describe('cn utility', () => {
    test('merges class names correctly', () => {
        const result = cn('c1', 'c2');
        expect(result).toBe('c1 c2');
    });

    test('handles conditional classes', () => {
        const result = cn('c1', true && 'c2', false && 'c3');
        expect(result).toBe('c1 c2');
    });

    test('merges tailwind classes using tailwind-merge', () => {
        const result = cn('p-4', 'p-2');
        expect(result).toBe('p-2');
    });

    test('handles various inputs', () => {
        expect(cn('foo', null, 'bar', undefined, 'baz')).toBe('foo bar baz');
    });
});
