import Link from '@/components/ui/app-link';
export default function NotFound() {
  return (
    <div className="bootstrap state">
      <h1>صفحه در دسترس نیست</h1>
      <Link href="/admin">بازگشت به مدیریت</Link>
    </div>
  );
}
