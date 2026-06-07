import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useCallback, useRef } from 'react'
import { sendChatMessageFn } from '@/src/server/chat'
import { bookAsClientFn } from '@/src/server/appointments'
import { ChatContainer } from '@/components/client/chat/ChatContainer'
import { ChatInput } from '@/components/client/chat/ChatInput'
import { ChatTreatmentCard } from '@/components/client/chat/ChatTreatmentCard'
import { ChatSlotPicker } from '@/components/client/chat/ChatSlotPicker'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'sonner'

interface Treatment {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  salon_id: string
  salon_name: string
  salon_address: string
}

interface Slot {
  start: string
  end: string
}

interface ToolData {
  name: string
  result: {
    treatments?: Treatment[]
    slots?: Slot[]
    error?: string
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  tools?: ToolData[]
}

export const Route = createFileRoute('/_client/client/chat')({
  component: ClientChatPage,
})

function ClientChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const pendingSlotRef = useRef<{ treatmentId: string; salonId: string } | null>(null)

  const handleSend = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setIsTyping(true)

    try {
      const result = await sendChatMessageFn({ data: { message } })
      if (result.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.error as string }])
      } else if (result.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.message!, tools: result.tools as ToolData[] | undefined }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' }])
    } finally {
      setIsTyping(false)
    }
  }, [])

  const handleSelectTreatment = useCallback((treatment: Treatment) => {
    const msg = `Chcę umówić się na ${treatment.name} w ${treatment.salon_name}`
    handleSend(msg)
  }, [handleSend])

  const handleSelectSlot = useCallback(async (slot: Slot) => {
    setIsTyping(true)
    const result = await bookAsClientFn({
      data: {
        treatmentId: '',
        startTime: slot.start,
        salonId: undefined,
      },
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Wizyta umówiona!')
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Wizyta została umówiona na ${new Date(slot.start).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`,
      }])
      router.invalidate()
    }
    setIsTyping(false)
  }, [router])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Czat"
        description="Umawiaj wizyty, pytaj o zabiegi &mdash; asystent AI pomoże Ci w każdej sprawie."
      />
      <ChatContainer
        messages={messages.map((m) => ({ role: m.role, content: m.content }))}
        isTyping={isTyping}
        onSend={handleSend}
        renderAfterMessage={(i) => (
          <>
            {messages[i].tools?.map((tool, j) => (
              <div key={`tool-${j}`}>
                {tool.name === 'searchTreatments' && tool.result.treatments && tool.result.treatments.length > 0 && (
                  <div className="mt-2">
                    <ChatTreatmentCard
                      treatments={tool.result.treatments}
                      onSelect={handleSelectTreatment}
                    />
                  </div>
                )}
                {tool.name === 'findAvailableSlots' && tool.result.slots && tool.result.slots.length > 0 && (
                  <div className="mt-2">
                    <ChatSlotPicker
                      slots={tool.result.slots}
                      onSelect={handleSelectSlot}
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      >
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </ChatContainer>
    </div>
  )
}
