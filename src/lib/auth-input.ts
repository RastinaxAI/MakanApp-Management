import { z } from 'zod';
import { latinDigits } from './formatting';

// This panel accepts Iranian mobile numbers in the user-requested 11-digit national format.
export const phoneInputSchema = z
  .string()
  .transform((value) => latinDigits(value).replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^09\d{9}$/, 'شماره همراه باید ۱۱ رقم باشد و با ۰۹ شروع شود.'));
