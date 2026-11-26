import { cn } from "@/lib/utils"

function Skeleton({ className, as: Component = "div", ...props }: React.ComponentProps<"div"> & { as?: "div" | "span" }) {
  return (
    <Component
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-sm bg-card bg-[linear-gradient(90deg,var(--card)_25%,var(--border)_50%,var(--card)_75%)] bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
