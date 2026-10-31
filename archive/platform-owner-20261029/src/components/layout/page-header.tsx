import Link from '@/components/ui/app-link';
import { ChevronLeft } from 'lucide-react';
export function PageHeader({
  title,
  description,
  action,
  parent,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  parent?: { href: string; label: string };
}) {
  return (
    <div className="page-header">
      <div>
        {parent && (
          <nav className="breadcrumb" aria-label="مسیر صفحه">
            <Link href={parent.href}>{parent.label}</Link>
            <ChevronLeft size={13} />
            <span>جزئیات</span>
          </nav>
        )}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
