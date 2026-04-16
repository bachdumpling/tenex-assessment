"use client"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { CitationDrawer } from "@/components/chat/CitationDrawer"
import { Button, buttonVariants } from "@/components/ui/button"
import { useChat } from "@/hooks/useChat"
import { useCitations } from "@/hooks/useCitations"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types/chat"
import { House, Loader2, MessageSquarePlus } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type ChatPanelProps = {
  folderId: string
  sessionId: string | null
  initialRows: Omit<ChatMessage, "isStreaming" | "streamError">[] | null
  starterQuestions: string[]
  /** Persist a new DB session so “New chat” survives refresh. */
  onStartNewChat?: () => Promise<void>
}

export function ChatPanel({
  folderId,
  sessionId,
  initialRows,
  starterQuestions,
  onStartNewChat,
}: ChatPanelProps) {
  const {
    messages,
    hydrate,
    sendMessage,
    loading,
    error,
    resetChat,
  } = useChat(folderId, sessionId)
  const { drawerOpen, activeCitation, openCitation, closeDrawer } = useCitations()
  const hydratedRef = useRef(false)
  const [newChatBusy, setNewChatBusy] = useState(false)
  const [newChatError, setNewChatError] = useState<string | null>(null)

  useEffect(() => {
    if (initialRows == null || hydratedRef.current) return
    hydrate(initialRows)
    hydratedRef.current = true
  }, [initialRows, hydrate])

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-gradient-to-b from-card/30 to-background px-4 py-3 md:px-5 md:py-4">
      <div className="mb-3 shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Chat
          </h1>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Grounded answers with citations from this folder.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "inline-flex items-center gap-1.5"
            )}
          >
            <House className="size-4 shrink-0" aria-hidden />
            Home
          </Link>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="shrink-0"
            disabled={
              !sessionId ||
              loading ||
              newChatBusy ||
              (messages.length === 0 && !error)
            }
            onClick={() => {
              void (async () => {
                setNewChatError(null)
                closeDrawer()
                if (onStartNewChat) {
                  setNewChatBusy(true)
                  try {
                    await onStartNewChat()
                  } catch (e) {
                    setNewChatError(
                      e instanceof Error ? e.message : "Could not start new chat"
                    )
                  } finally {
                    setNewChatBusy(false)
                  }
                  return
                }
                resetChat()
              })()
            }}
          >
            <MessageSquarePlus aria-hidden />
            New chat
          </Button>
        </div>
      </div>
      {newChatError ? (
        <p className="mb-2 text-xs text-destructive">{newChatError}</p>
      ) : null}

      {starterQuestions.length > 0 && messages.length === 0 && !loading ? (
        <div className="mb-3 shrink-0 flex flex-wrap gap-2.5">
          {starterQuestions.map((q) => (
            <Button
              key={q}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto! min-h-10 max-w-full items-start justify-start px-3 py-2.5 text-left text-base font-normal leading-snug whitespace-normal"
              onClick={() => {
                void sendMessage(q)
              }}
            >
              {q}
            </Button>
          ))}
        </div>
      ) : null}

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6 px-0 py-1 pr-1 pb-2 md:gap-8">
          {messages.map((m) =>
            m.role === "user" ? (
              <Message key={m.id} from="user">
                <MessageContent>
                  <p className="max-w-[min(100%,42rem)] whitespace-pre-wrap leading-relaxed">
                    {m.content}
                  </p>
                </MessageContent>
              </Message>
            ) : (
              <Message key={m.id} from="assistant">
                <MessageContent className="w-full max-w-full">
                  <MessageBubble message={m} onOpenCitation={openCitation} />
                </MessageContent>
              </Message>
            )
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Thinking…
            </div>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatComposer sessionId={sessionId} loading={loading} sendMessage={sendMessage} />

      <CitationDrawer
        open={drawerOpen}
        citation={activeCitation}
        onClose={closeDrawer}
      />
    </div>
  )
}
