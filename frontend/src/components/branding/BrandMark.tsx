interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 40, className }: BrandMarkProps) {
  return (
    <img
      src="/favicon-new.svg"
      alt="ShiftMatch"
      width={size}
      height={size}
      className={className}
    />
  );
}
