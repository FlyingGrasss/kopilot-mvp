import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function readableTextColor(hex: string): "#18181b" | "#ffffff" {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/u.test(clean)) return "#ffffff";

  const r = channelToLinear(Number.parseInt(clean.slice(0, 2), 16));
  const g = channelToLinear(Number.parseInt(clean.slice(2, 4), 16));
  const b = channelToLinear(Number.parseInt(clean.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.42 ? "#18181b" : "#ffffff";
}

export interface AvatarProps {
  name: string;
  color?: string | null;
  size?: AvatarSize;
  className?: string;
  label?: string;
}

export function Avatar({ name, color, size = "md", className, label }: AvatarProps) {
  const hasColor = Boolean(color && /^#[0-9a-fA-F]{6}$/u.test(color));

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-lg border border-black/5 font-semibold",
        !hasColor && "bg-[color:var(--elevated)] text-[color:var(--text)]",
        sizeClasses[size],
        className,
      )}
      role={label ? "img" : undefined}
      style={
        hasColor
          ? { backgroundColor: color!, color: readableTextColor(color!) }
          : undefined
      }
      title={label ? undefined : name}
    >
      {initials(name)}
    </span>
  );
}
