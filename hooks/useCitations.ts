"use client"

import type { Citation } from "@/types/citations"
import { useCallback, useState } from "react"

export function useCitations(): {
  drawerOpen: boolean
  activeCitation: Citation | null
  openCitation: (c: Citation) => void
  closeDrawer: () => void
} {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Citation | null>(null)

  const openCitation = useCallback((c: Citation) => {
    setActive(c)
    setOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setOpen(false)
  }, [])

  return { drawerOpen: open, activeCitation: active, openCitation, closeDrawer }
}
