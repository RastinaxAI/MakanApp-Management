import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/vazirmatn';
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css';
import './globals.css';
import './jalali-date-input.css';
import { RootProviders } from '@/components/providers';
export const metadata: Metadata = {
  title: { default: 'ماکان | ارتباط و یادگیری', template: '%s | ماکان' },
  description: 'فضای شخصی و آموزشی ماکان برای فرد عادی، دانشجو، استاد، والدین و مدیر آموزشگاه',
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
