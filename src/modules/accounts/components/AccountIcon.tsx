import { Banknote, ChartColumn, Landmark, PiggyBank, Wallet } from 'lucide-react';

type AccountIconProps = {
  icon: string;
  color: string;
};

export function AccountIcon({ icon, color }: AccountIconProps) {
  const commonClassName = 'h-5 w-5';

  const iconMap = {
    landmark: <Landmark className={commonClassName} />,
    wallet: <Wallet className={commonClassName} />,
    'piggy-bank': <PiggyBank className={commonClassName} />,
    banknote: <Banknote className={commonClassName} />,
    'chart-column': <ChartColumn className={commonClassName} />
  };

  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-control border border-border"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {iconMap[icon as keyof typeof iconMap] ?? <Landmark className={commonClassName} />}
    </div>
  );
}
