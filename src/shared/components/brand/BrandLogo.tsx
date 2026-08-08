import horizontalDarkUrl from '@/assets/brand/logo-horizontal-dark.png';
import horizontalLightUrl from '@/assets/brand/logo-horizontal-light.png';
import markBlackUrl from '@/assets/brand/logo-mark-black.png';
import markGradientUrl from '@/assets/brand/logo-mark-gradient.png';
import { cn } from '@/shared/utils/cn';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  decorative?: boolean;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
  variant?: 'mark' | 'horizontal';
};

const brandAssets = {
  horizontal: {
    dark: horizontalDarkUrl,
    light: horizontalLightUrl
  },
  mark: {
    dark: markGradientUrl,
    light: markBlackUrl
  }
} as const;

const sizeClasses = {
  horizontal: {
    sm: 'h-7 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-10 w-auto'
  },
  mark: {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }
} as const;

export function BrandLogo({
  alt = 'Finance Pro',
  className,
  decorative = false,
  size = 'md',
  theme = 'dark',
  variant = 'horizontal'
}: BrandLogoProps) {
  const src = brandAssets[variant][theme];

  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      className={cn('shrink-0 object-contain', sizeClasses[variant][size], className)}
    />
  );
}
