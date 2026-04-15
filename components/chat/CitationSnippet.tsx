"use client"

import { cn } from "@/lib/utils"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Parses a snippet into a uniform grid when every line uses the same delimiter
 * and column count (simple CSV/TSV — no quoted commas).
 */
function tryDelimitedGrid(text: string): string[][] | null {
  const t = text.trim()
  if (!t.includes("\n")) return null
  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length < 2 || lines.length > 80) return null

  const tabLines = lines.filter((l) => l.includes("\t")).length
  const delim = tabLines >= lines.length / 2 ? "\t" : ","
  if (delim === "," && lines.some((l) => /"[^"]*,/.test(l))) return null

  const rows = lines.map((l) => l.split(delim).map((c) => c.trim()))
  const w = rows[0].length
  if (w < 2 || w > 20) return null
  if (!rows.every((r) => r.length === w)) return null
  return rows
}

function DelimitedTable({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows
  return (
    <div className="mt-2 max-h-[45vh] overflow-auto rounded-md border border-border bg-muted/20">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="sticky top-0 z-[1] border-b border-border bg-muted/70 backdrop-blur-sm">
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="max-w-[11rem] px-2.5 py-2 font-semibold text-foreground break-words"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="max-w-[13rem] px-2.5 py-1.5 align-top text-muted-foreground break-words"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const snippetMarkdownComponents: Partial<Components> = {
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 font-heading text-base font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2 font-heading text-sm font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-1.5 font-heading text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  hr: () => <hr className="my-6 border-border/50" />,
  p: ({ children }) => (
    <p className="my-0 text-pretty leading-relaxed text-foreground/95 first:mt-0 [&:not(:first-child)]:mt-3">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 text-foreground/95">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 text-foreground/95">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted/60 px-1 font-mono text-[11px] text-foreground">
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
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  table({ children }) {
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-md border border-border bg-muted/10">
        <table className="w-full min-w-max border-collapse text-left text-xs">
          {children}
        </table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-muted/50">{children}</thead>
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>
  },
  tr({ children }) {
    return <tr className="border-b border-border/50 last:border-0">{children}</tr>
  },
  th({ children }) {
    return (
      <th className="px-2.5 py-1.5 text-left text-[11px] font-semibold text-foreground">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-2.5 py-1.5 align-top text-[11px] text-foreground/90">{children}</td>
    )
  },
}

type CitationSnippetProps = {
  text: string
  className?: string
}

/**
 * Excerpt: delimited grid as table; dense one-line CSV-ish as wrapped mono;
 * otherwise **rendered Markdown** (headings, lists, emphasis) — not raw source.
 */
export function CitationSnippet({ text, className }: CitationSnippetProps) {
  const grid = tryDelimitedGrid(text)
  if (grid) {
    return <DelimitedTable rows={grid} />
  }

  const denseOneLine =
    !text.includes("\n") && text.length > 100 && (text.match(/,/g)?.length ?? 0) > 4

  if (denseOneLine) {
    return (
      <div
        className={cn(
          "mt-2 max-h-[45vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words break-all",
          className
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {text}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "mt-2 max-h-[45vh] overflow-auto rounded-md border border-border bg-muted/20 p-4 text-sm leading-relaxed text-foreground",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={snippetMarkdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
