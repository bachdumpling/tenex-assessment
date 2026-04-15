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
import { Button } from "@/components/ui/button"
import { useChat } from "@/hooks/useChat"
import { useCitations } from "@/hooks/useCitations"
import type { ChatMessage } from "@/types/chat"
import { Loader2, MessageSquarePlus } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type ChatPanelProps = {
  folderId: string
  sessionId: string | null
  initialRows: Omit<ChatMessage, "isStreaming" | "streamError">[] | null
  starterQuestions: string[]
  /** Injected after ingest when the thread is still empty (server summary). */
  bootstrapSummary?: string | null
  /** Persist a new DB session so “New chat” survives refresh. */
  onStartNewChat?: () => Promise<void>
}

export function ChatPanel({
  folderId,
  sessionId,
  initialRows,
  starterQuestions,
  bootstrapSummary,
  onStartNewChat,
}: ChatPanelProps) {
  const {
    messages,
    hydrate,
    sendMessage,
    loading,
    error,
    prependBootstrapAssistant,
    resetChat,
  } = useChat(folderId, sessionId)
  const { drawerOpen, activeCitation, openCitation, closeDrawer } = useCitations()
  const hydratedRef = useRef(false)
  const bootstrappedRef = useRef(false)
  const [newChatBusy, setNewChatBusy] = useState(false)
  const [newChatError, setNewChatError] = useState<string | null>(null)

  useEffect(() => {
    if (initialRows == null || hydratedRef.current) return
    hydrate(initialRows)
    hydratedRef.current = true
  }, [initialRows, hydrate])

  useEffect(() => {
    const s = bootstrapSummary?.trim()
    if (!s || bootstrappedRef.current) return
    if (messages.length > 0) return
    prependBootstrapAssistant(s)
    bootstrappedRef.current = true
  }, [bootstrapSummary, messages.length, prependBootstrapAssistant])

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-gradient-to-b from-card/30 to-background px-4 py-3 md:px-5 md:py-4">
      <div className="mb-3 shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Chat
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Grounded answers with citations from this folder.
          </p>
        </div>
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
      {newChatError ? (
        <p className="mb-2 text-xs text-destructive">{newChatError}</p>
      ) : null}

      {starterQuestions.length > 0 && messages.length === 0 && !loading ? (
        <div className="mb-3 shrink-0 flex flex-wrap gap-2">
          {starterQuestions.map((q) => (
            <Button
              key={q}
              type="button"
              variant="outline"
              size="xs"
              className="max-w-full text-left font-normal"
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
                  <p className="max-w-[min(100%,42rem)] whitespace-pre-wrap text-sm leading-relaxed">
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
