import { notFound } from 'next/navigation';
import { AdminView } from './admin-view';
const sections = new Set([
  'organizations',
  'users',
  'education',
  'roles',
  'account',
  'commerce',
  'finance',
  'operations',
  'audit',
  'messaging',
  'moderation',
]);
const detailSections = new Set([
  'organizations',
  'users',
  'education',
  'commerce',
  'finance',
  'moderation',
]);
export function renderAdminRoute(parts: string[]) {
  const [section = '', id] = parts;
  if (parts.length > 2 || (section && !sections.has(section))) notFound();
  if (id && (!detailSections.has(section) || !/^[0-9a-f-]{36}$/i.test(id))) notFound();
  return <AdminView section={section} id={id} />;
}
