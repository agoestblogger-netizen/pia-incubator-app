import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0F5132]/10 text-[#0F5132] border border-[#0F5132]/20",
        gold:
          "border-transparent bg-[#9C7A2E]/15 text-[#9C7A2E] border border-[#9C7A2E]/30",
        success:
          "border-transparent bg-green-100 text-green-800 border border-green-200",
        warning:
          "border-transparent bg-amber-100 text-amber-800 border border-amber-200",
        destructive:
          "border-transparent bg-red-100 text-red-800 border border-red-200",
        secondary:
          "border-transparent bg-gray-100 text-gray-800 border border-gray-200",
        outline: "text-gray-700 border border-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
