"use client"

import { cn } from "@/lib/utils"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Renders `p` as spans so this can sit inside flex rows without invalid nesting. */
const inlineComponents: Partial<Components> = {
  p: ({ children }) => (
    <span className="block max-w-full break-words last:mb-0 [&:not(:first-child)]:mt-1">
      {children}
    </span>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-inherit">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-inherit">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted/50 px-1 font-mono text-xs text-inherit">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}

type InlineMarkdownProps = {
  text: string
  className?: string
}

/** Short strings (headings, section titles) that may contain Markdown emphasis. */
export function InlineMarkdown({ text, className }: InlineMarkdownProps) {
  const t = text.trim()
  if (!t) return null
  return (
    <span className={cn("min-w-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineComponents}>
        {t}
      </ReactMarkdown>
    </span>
  )
}
