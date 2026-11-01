import { latinDigits } from './formatting';

// Shared with the server schema; this module has no form or validation-library dependency.
export const mobilePattern = /^09\d{9}$/;
export const codePattern = /^\d{6}$/;
export const mobileError = 'شماره همراه باید ۱۱ رقم باشد و با ۰۹ شروع شود.';
export const codeError = 'کد ورود باید دقیقاً ۶ رقم باشد.';
export const normalizeMobile = (value: string) => latinDigits(value).replace(/[\s-]/g, '');
export const normalizeCode = (value: string) => latinDigits(value).replace(/\s/g, '');
