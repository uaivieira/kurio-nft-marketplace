import { CircleCheckGlyph, InfoGlyph, LoaderGlyph, OctagonXGlyph, TriangleAlertGlyph } from '@/components/icons/glyphs'
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckGlyph className="size-4" />,
        info: <InfoGlyph className="size-4" />,
        warning: <TriangleAlertGlyph className="size-4" />,
        error: <OctagonXGlyph className="size-4" />,
        loading: <LoaderGlyph className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
