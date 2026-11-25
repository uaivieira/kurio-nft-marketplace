import type { SVGProps } from 'react'

/** Utility glyphs (status, close, steppers) with Lucide's geometry (ISC), inlined to avoid shipping the icon runtime. */
function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

export const MinusGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M5 12h14" /></Glyph>
export const PlusGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M5 12h14" /><path d="M12 5v14" /></Glyph>
export const RefreshGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></Glyph>
export const RotateCcwGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Glyph>
export const WrenchGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" /></Glyph>
export const CircleAlertGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></Glyph>
export const LoaderGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Glyph>
export const XGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Glyph>
export const TriangleAlertGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></Glyph>
export const CheckGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="M20 6 9 17l-5-5" /></Glyph>
export const ChevronUpGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="m18 15-6-6-6 6" /></Glyph>
export const CircleGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><circle cx="12" cy="12" r="10" /></Glyph>
export const CircleCheckGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><circle cx="12" cy="12" r="10" /><path d="m16 9-5.5 5.5L8 12" /></Glyph>
export const InfoGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Glyph>
export const OctagonXGlyph = (props: SVGProps<SVGSVGElement>) => <Glyph {...props}><path d="m15 9-6 6" /><path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" /><path d="m9 9 6 6" /></Glyph>
