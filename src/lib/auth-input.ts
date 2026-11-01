import { z } from 'zod';
import {
  mobilePattern,
  codePattern,
  mobileError,
  codeError,
  normalizeMobile,
  normalizeCode,
} from './login-input';

// This panel accepts Iranian mobile numbers in the user-requested 11-digit national format.
export const phoneInputSchema = z
  .string()
  .transform(normalizeMobile)
  .pipe(z.string().regex(mobilePattern, mobileError));

export const otpInputSchema = z
  .string()
  .transform(normalizeCode)
  .pipe(z.string().regex(codePattern, codeError));
