import { cn } from "@/lib/utils"

/** Shimmer placeholder. Motion is neutralised globally under prefers-reduced-motion. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
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
