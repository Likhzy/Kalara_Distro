import { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { ChannelType } from '../types';
import { STORE_INFO } from '../data/catalog';

interface ChannelModalProps {
  channel: ChannelType;
  onClose: () => void;
}

export function ChannelModal({ channel, onClose }: ChannelModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
    if (!channel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channel, onClose]);

  if (!channel) return null;

  const info = STORE_INFO.channels[channel];

  const handleCopy = async () => {
    const textToCopy = channel === 'location' ? STORE_INFO.address : info.handle;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-outline rounded-none flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline">
          <span className="font-label text-label-sm text-on-surface-variant uppercase">
            KANAL RESMI // KALARA DISTRO
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela kanal"
            className="border border-outline bg-surface text-on-surface p-xs hover:bg-primary hover:text-on-primary transition-colors duration-snap cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-lg flex flex-col gap-md">
          <h2 id="channel-modal-title" className="font-headline text-headline-md text-on-surface uppercase">
            {info.title}
          </h2>

          <div className="p-md border border-outline bg-surface-container flex items-center justify-between gap-sm">
            <span className="font-label text-label-md text-on-surface break-all">
              {channel === 'location' ? STORE_INFO.address : info.handle}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="border border-outline bg-surface text-on-surface px-sm py-xs font-label text-label-sm uppercase inline-flex items-center gap-xs shrink-0 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>TERSALIN</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>SALIN</span>
                </>
              )}
            </button>
          </div>

          <p className="font-body text-body-md text-on-surface-variant">
            {info.note}
          </p>

          {channel === 'location' && (
            <div className="border-t border-outline-subtle pt-sm flex items-center justify-between">
              <span className="font-label text-label-sm text-on-surface-variant uppercase">
                JAM OPERASIONAL
              </span>
              <span className="font-label text-label-sm text-on-surface uppercase tabular-nums">
                {STORE_INFO.hours}
              </span>
            </div>
          )}

          <div className="pt-sm flex items-center gap-sm">
            <a
              href={info.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-accent text-on-accent border border-outline px-lg py-sm font-label text-label-md uppercase text-center inline-flex items-center justify-center gap-xs hover:bg-primary hover:text-on-primary transition-colors duration-snap"
            >
              <span>{channel === 'location' ? 'BUKA DI GOOGLE MAPS' : 'BUKA KANAL RESMI'}</span>
              <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                arrow_outward
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
