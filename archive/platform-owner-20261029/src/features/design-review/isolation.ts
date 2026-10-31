export function isDesignReviewPath(path: string) {
  return path === '/design-review' || path.startsWith('/design-review/');
}
export function isReviewEnabled(value: string | undefined) {
  return value === 'true';
}
