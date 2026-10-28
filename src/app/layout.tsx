import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/vazirmatn';
import './globals.css';
import { RootProviders } from '@/features/access-context/provider';
export const metadata: Metadata = {
  title: { default: 'ماکان | پنل مدیریت', template: '%s | مدیریت ماکان' },
  description: 'پنل مدیریت فارسی پلتفرم آموزشی ماکان',
  robots: { index: false, follow: false },
  applicationName: 'ماکان',
  appleWebApp: { capable: true, title: 'ماکان', statusBarStyle: 'default' },
  icons: { icon: '/icons/makan-192.png', apple: '/icons/makan-apple-180.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1169b8',
  viewportFit: 'cover',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
