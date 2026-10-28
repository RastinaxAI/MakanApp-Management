'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './button';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  description,
  children,
  side = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        dir="rtl"
        className={`dialog-content ${side ? 'sheet-content' : ''}`}
      >
        <div className="dialog-heading">
          <div>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              {description ?? 'اطلاعات را بررسی و سپس تأیید کنید.'}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close asChild>
            <Button aria-label="بستن" size="icon" variant="ghost">
              <X size={19} />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
