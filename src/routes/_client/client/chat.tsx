import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { sendChatMessageFn, getChatHistoryFn } from '@/src/server/chat'
import { ChatContainer } from '@/components/client/chat/ChatContainer'
import { ChatInput } from '@/components/client/chat/ChatInput'
import { PageHeader } from '@/components/ui/page-header'

export const Route = createFileRoute('/_client/client/chat')({
  component: ClientChatPage,
})

interface ChatMessageData {
  role: 'user' | 'assistant'
  content: string
}

function ClientChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setIsTyping(true)

    try {
      const result = await sendChatMessageFn({ data: { message } })
      if (result.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.error || 'Wystąpił błąd.' }])
      } else if (result.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.message! }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' }])
    } finally {
      setIsTyping(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Czat"
        description="Umawiaj wizyty, pytaj o zabiegi &mdash; asystent AI pomoże Ci w każdej sprawie."
      />
      <ChatContainer messages={messages} isTyping={isTyping} onSend={handleSend}>
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </ChatContainer>
    </div>
  )
}
