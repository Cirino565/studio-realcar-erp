import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex cursor-pointer shrink-0 items-center justify-center rounded-2xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-violet-300/40 focus-visible:ring-3 focus-visible:ring-violet-500/25 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/30 hover:from-violet-500 hover:to-fuchsia-500",
        outline:
          "border-white/[0.10] bg-white/[0.04] text-slate-100 hover:border-white/[0.16] hover:bg-white/[0.07] aria-expanded:bg-white/[0.08] aria-expanded:text-white",
        secondary:
          "border-white/[0.08] bg-white/[0.07] text-white hover:bg-white/[0.10] aria-expanded:bg-white/[0.10] aria-expanded:text-white",
        ghost:
          "text-slate-300 hover:bg-white/[0.07] hover:text-white aria-expanded:bg-white/[0.08] aria-expanded:text-white",
        destructive:
          "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/15 hover:bg-rose-500/15 focus-visible:border-rose-300/40 focus-visible:ring-rose-500/20",
        link: "text-violet-300 underline-offset-4 hover:text-violet-200 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4",
        xs: "h-7 gap-1 rounded-xl px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-xl px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5",
        icon: "size-10",
        "icon-xs": "size-7 rounded-xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
