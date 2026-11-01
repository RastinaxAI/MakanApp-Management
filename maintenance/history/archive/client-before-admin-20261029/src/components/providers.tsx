'use client';
import { DirectionProvider } from '@radix-ui/react-direction';
import { PwaProvider } from '@/features/pwa/provider';
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <PwaProvider>{children}</PwaProvider>
    </DirectionProvider>
  );
}
