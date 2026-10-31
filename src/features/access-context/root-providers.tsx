'use client';
import { DirectionProvider } from '@radix-ui/react-direction';
import { PwaProvider } from '@/features/pwa/provider';

// Public pages do not import the authenticated access context or the admin API catalog.
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <PwaProvider>{children}</PwaProvider>
    </DirectionProvider>
  );
}
