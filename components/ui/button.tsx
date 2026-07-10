import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex cursor-pointer shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-violet-400 focus-visible:ring-4 focus-visible:ring-violet-100 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/20 hover:from-violet-700 hover:to-fuchsia-700",
        outline:
          "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800 aria-expanded:bg-violet-50 aria-expanded:text-violet-800",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 aria-expanded:bg-slate-200 aria-expanded:text-slate-950",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-950 aria-expanded:bg-slate-100 aria-expanded:text-slate-950",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:border-rose-300 focus-visible:ring-rose-100",
        link: "text-violet-700 underline-offset-4 hover:text-violet-900 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-lg px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5",
        icon: "size-10",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
