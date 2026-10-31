import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ماکان پنل مدیریت',
    short_name: 'ماکان',
    description: 'مدیریت سازمان‌ها و آموزش در پنل مالک ماکان',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f6fa',
    theme_color: '#11213a',
    icons: [
      { src: '/icons/makan-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/makan-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/makan-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'سازمان‌ها', url: '/admin/organizations' },
      { name: 'اعلان‌های من', url: '/admin/account?tab=notifications' },
    ],
  };
}
