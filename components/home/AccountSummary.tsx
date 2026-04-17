"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

type AccountSummaryProps = {
  name?: string | null
  email?: string | null
  image?: string | null
  className?: string
}

function displayName(name: string | null | undefined, email: string | null | undefined) {
  const n = name?.trim()
  if (n) return n
  const e = email?.trim()
  if (e) {
    const at = e.indexOf("@")
    return at > 0 ? e.slice(0, at) : e
  }
  return "Account"
}

export function AccountSummary({ name, email, image, className }: AccountSummaryProps) {
  const title = displayName(name, email)

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            width={40}
            height={40}
            referrerPolicy="no-referrer"
            className="size-10 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          {email?.trim() ? (
            <p className="truncate text-xs text-muted-foreground">{email.trim()}</p>
          ) : null}
          <p className="sr-only">Signed in with Google</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 self-start sm:self-auto"
        onClick={() => {
          void signOut({ callbackUrl: "/login" })
        }}
      >
        <LogOut className="size-3.5" aria-hidden />
        Log out
      </Button>
    </div>
  )
}
