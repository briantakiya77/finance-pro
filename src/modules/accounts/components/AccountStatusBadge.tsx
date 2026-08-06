import { Badge } from '@/shared/components/ui';

type AccountStatusBadgeProps = {
  label: string;
  variant: 'default' | 'success' | 'warning';
};

export function AccountStatusBadge({ label, variant }: AccountStatusBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>;
}
