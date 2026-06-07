import { useRef, useEffect } from 'react'
import { ChatMessage, ChatTypingIndicator } from './ChatMessage'

interface ChatMessageData {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContainerProps {
  messages: ChatMessageData[]
  isTyping: boolean
  onSend: (message: string) => void
  children?: React.ReactNode
}

export function ChatContainer({ messages, isTyping, children }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="bg-card rounded-xl border border-border h-[600px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-secondary-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cześć! Jestem asystentem gabinetu. Opowiedz mi o swoich potrzebach &mdash; pomogę Ci znaleźć odpowiedni zabieg, sprawdzę dostępne terminy i umówię wizytę.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isTyping && <ChatTypingIndicator />}
        <div ref={bottomRef} />
      </div>
      {children}
    </div>
  )
}
