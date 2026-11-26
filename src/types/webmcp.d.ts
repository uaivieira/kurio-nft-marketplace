import 'react'

declare module 'react' {
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    toolname?: string
    tooldescription?: string
  }
  interface HTMLAttributes<T> {
    toolparamtitle?: string
    toolparamdescription?: string
  }
}

declare global {
  interface WebMcpToolResult {
    content: Array<{ type: 'text'; text: string }>
    isError?: boolean
  }

  interface WebMcpTool {
    name: string
    description: string
    inputSchema: Record<string, unknown>
    annotations?: { readOnlyHint?: boolean }
    execute: (input: Record<string, unknown>) => Promise<WebMcpToolResult>
  }

  interface Navigator {
    modelContext?: { registerTool: (tool: WebMcpTool) => unknown }
  }
}
