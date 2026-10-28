'use client';
import { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePwa } from './provider';

export function InstallPanel({ compact = false }: { compact?: boolean }) {
  const { installed, installPrompt, install, secure, error } = usePwa();
  const [help, setHelp] = useState(false);
  if (installed)
    return compact ? null : (
      <p className="pwa-status">
        <CheckCircle2 size={19} />
        پنل به‌صورت برنامه روی این دستگاه باز شده است.
      </p>
    );
  return (
    <div className={compact ? 'pwa-install-compact' : 'pwa-install'}>
      {!compact && (
        <p>پنل ماکان را روی دستگاه نصب کنید تا از آیکون آن و در پنجره مستقل وارد شوید.</p>
      )}
      <Button variant="outline" onClick={() => (installPrompt ? void install() : setHelp(true))}>
        <Download size={18} />
        نصب پنل روی دستگاه
      </Button>
      {!compact && !secure && (
        <p className="field-help">
          برای نصب، نشانی امن HTTPS پنل را باز کنید. نشانی محلی فقط روی همین رایانه قابل استفاده
          است.
        </p>
      )}
      {!compact && error && (
        <p role="alert" className="field-help">
          آماده‌سازی نصب کامل نشد. اتصال را بررسی و صفحه را تازه کنید.
        </p>
      )}
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent
          title="نصب پنل ماکان"
          description="روش نصب به مرورگر و دستگاه شما بستگی دارد."
        >
          <ol className="pwa-instructions">
            <li>
              <strong>Android و رایانه</strong>
              <p>
                منوی Chrome یا Edge را باز کنید و گزینه «نصب برنامه» یا «افزودن به صفحه اصلی» را
                انتخاب کنید.
              </p>
            </li>
            <li>
              <strong>iPhone و iPad</strong>
              <p>
                نشانی امن پنل را در Safari باز کنید. از Share، گزینه Add to Home Screen را بزنید؛
                سپس برنامه را از آیکون صفحه اصلی باز کنید.
              </p>
            </li>
          </ol>
          <p className="field-help">
            اگر گزینه نصب دیده نمی‌شود، مرورگر را به‌روز کنید و مطمئن شوید نشانی پنل HTTPS است. برای
            کار با داده‌های پنل، اینترنت لازم است.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
