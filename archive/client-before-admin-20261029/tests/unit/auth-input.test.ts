import { describe, expect, it } from 'vitest';
import { phoneInputSchema } from '@/lib/auth-input';
describe('Iranian 11-digit mobile login numbers', () => {
  it.each([
    ['۰۹۱۲ ۳۴۵ ۶۷۸۹', '09123456789'],
    ['۰۹۱۰۰۰۰۰۰۰۰', '09100000000'],
    ['09100000005', '09100000005'],
  ])('normalizes %s without changing the account identity', (input, expected) => {
    expect(phoneInputSchema.parse(input)).toBe(expected);
  });
  it.each([
    '123456',
    '0910000000',
    '091000000000',
    '08100000000',
    '+989100000000',
    '+12025550171',
    '<script>',
  ])('rejects invalid identifier %s', (input) => {
    expect(phoneInputSchema.safeParse(input).success).toBe(false);
  });
});
