import type { ReactNode } from 'react';

type PageHeaderProps = {
  action?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 text-caption font-medium uppercase text-accent">{eyebrow}</p>
        )}
        <h1 className="text-title font-semibold text-text-primary">{title}</h1>
        <p className="mt-3 text-body text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
