import { useState } from 'react';

import assistantAvatar from '@/assets/finance-assistant.jpg';
import { AssistantPanel } from '@/modules/ai/components/AssistantPanel';

export function AIAssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir assistente Finance Pro"
        title="Assistente Finance Pro"
        className="group fixed bottom-[7.5rem] right-4 z-40 h-14 w-14 rounded-full border border-accent/70 bg-surface p-0.5 shadow-glow outline-none transition-transform duration-normal ease-[var(--ease-premium)] hover:-translate-y-0.5 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background xl:bottom-8 xl:right-8 xl:h-16 xl:w-16"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={assistantAvatar}
          alt=""
          className="h-full w-full rounded-full object-cover"
          aria-hidden="true"
        />
        <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
        <span className="absolute -left-3 top-1/2 hidden -translate-x-full -translate-y-1/2 whitespace-nowrap rounded-control border border-border bg-surface-secondary px-3 py-2 text-caption text-text-primary shadow-elevated xl:group-hover:block">
          Assistente Maria
        </span>
      </button>

      {isOpen && <AssistantPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}
