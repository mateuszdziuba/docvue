import { createFileRoute, useRouter } from '@tanstack/react-router'
import { addMinutes, format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChatBookingError } from '@/components/client/chat/ChatBookingError'
import { ChatBookingSummary } from '@/components/client/chat/ChatBookingSummary'
import { ChatContainer } from '@/components/client/chat/ChatContainer'
import { ChatInput } from '@/components/client/chat/ChatInput'
import {
  ChatRequiredFormsCard,
  type RequiredForm,
} from '@/components/client/chat/ChatRequiredFormsCard'
import { ChatSlotPicker, type Slot } from '@/components/client/chat/ChatSlotPicker'
import { ChatTreatmentCard } from '@/components/client/chat/ChatTreatmentCard'
import { PageHeader } from '@/components/ui/page-header'
import { bookAsClientFn } from '@/src/server/appointments'
import { getChatHistoryFn, sendChatMessageFn } from '@/src/server/chat'

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

interface BookingOffer {
  treatmentId: string
  treatmentName: string
  price: number | null
  durationMinutes: number
  salonId: string
  salonName: string
  salonAddress: string | null
  startTime: string
}

interface ToolData {
  id: string
  name: string
  result: {
    treatments?: Treatment[]
    slots?: Slot[]
    treatmentId?: string
    salonId?: string
    forms?: RequiredForm[]
    status?: 'scheduled' | 'pending_forms'
    error?: string
    needsConfirmation?: boolean
    offer?: BookingOffer
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: ToolData[]
}

let nextMessageId = 1

function createMessage(role: Message['role'], content: string, tools?: ToolData[]): Message {
  return { id: `msg-${nextMessageId++}`, role, content, tools }
}

interface PendingBooking {
  slot: Slot
  treatment: Treatment
}

export const Route = createFileRoute('/_client/client/chat')({
  component: ClientChatPage,
})

function friendlyBookingError(error: string): string {
  if (error.includes('zajęty')) {
    return 'Wybrany termin został właśnie zajęty. Wybierz inną godzinę.'
  }
  if (error.includes('zalogowany')) {
    return 'Musisz być zalogowany, aby umówić wizytę.'
  }
  if (error.includes('profilu klienta')) {
    return 'Nie znaleziono profilu klienta. Skontaktuj się z salonem.'
  }
  if (error.includes('gabinet')) {
    return 'Nie udało się określić gabinetu. Wybierz zabieg ponownie.'
  }
  return 'Nie udało się umówić wizyty. Spróbuj ponownie za chwilę.'
}

function ClientChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const pendingSlotRef = useRef<{ treatment: Treatment } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      try {
        const result = await getChatHistoryFn()
        if (cancelled || !result.history || result.history.length === 0) return

        const restored: Message[] = result.history
          .slice()
          .reverse()
          .map((m) => ({
            id: m.id,
            role: m.role as Message['role'],
            content: m.content,
            tools: (m as any).tool_calls
              ? ((m as any).tool_calls as Array<{ name: string; result: ToolData['result'] }>).map(
                  (tool, i) => ({
                    id: `hist-${m.id}-${i}`,
                    name: tool.name,
                    result: tool.result,
                  }),
                )
              : undefined,
          }))

        setMessages((prev) => (prev.length > 0 ? prev : restored))
      } catch {
        // cicho ignoruj błąd wczytywania historii
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSend = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, createMessage('user', message)])
    setIsTyping(true)

    try {
      const result = await sendChatMessageFn({ data: { message } })
      if ('error' in result) {
        setMessages((prev) => [
          ...prev,
          createMessage('assistant', result.error ?? 'Przepraszam, wystąpił błąd.'),
        ])
      } else if ('message' in result && result.message) {
        const messageId = nextMessageId
        const tools = (
          ('tools' in result ? result.tools : undefined) as ToolData[] | undefined
        )?.map((tool) => ({
          ...tool,
          id: `tool-${messageId}-${tool.name}`,
        }))

        const bookingOffer = tools?.find((tool) => tool.name === 'bookAppointment')
        if (bookingOffer?.result.needsConfirmation && bookingOffer.result.offer) {
          const offer = bookingOffer.result.offer
          setPendingBooking({
            slot: {
              start: offer.startTime,
              end: addMinutes(new Date(offer.startTime), offer.durationMinutes).toISOString(),
              treatmentId: offer.treatmentId,
              salonId: offer.salonId,
            },
            treatment: {
              id: offer.treatmentId,
              name: offer.treatmentName,
              description: null,
              duration_minutes: offer.durationMinutes,
              price: offer.price,
              salon_id: offer.salonId,
              salon_name: offer.salonName,
              salon_address: offer.salonAddress ?? '',
            },
          })
        }

        setMessages((prev) => [
          ...prev,
          createMessage('assistant', 'message' in result ? result.message : '', tools),
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', 'Przepraszam, wystąpił błąd. Spróbuj ponownie.'),
      ])
    } finally {
      setIsTyping(false)
    }
  }, [])

  const handleSelectTreatment = useCallback(
    (treatment: Treatment) => {
      pendingSlotRef.current = { treatment }
      const msg = `Chcę umówić się na ${treatment.name} w ${treatment.salon_name}`
      handleSend(msg)
    },
    [handleSend],
  )

  const handleSelectSlot = useCallback(
    (slot: Slot) => {
      const treatment = pendingSlotRef.current?.treatment
      if (treatment) {
        setPendingBooking({ slot, treatment })
        return
      }
      if (slot.treatmentId) {
        for (const message of messages) {
          const searchTreatments = message.tools?.find(
            (tool) => tool.name === 'searchTreatments' && tool.result.treatments,
          )
          const matched = searchTreatments?.result.treatments?.find(
            (candidate) => candidate.id === slot.treatmentId,
          )
          if (matched) {
            setPendingBooking({ slot, treatment: matched })
            return
          }
        }
      }
      toast.error('Najpierw wybierz zabieg z listy, aby umówić wizytę.')
    },
    [messages],
  )

  const handleConfirmBooking = useCallback(async () => {
    if (!pendingBooking || isBooking) return
    const { slot, treatment } = pendingBooking
    setIsBooking(true)

    try {
      const result = await bookAsClientFn({
        data: {
          treatmentId: slot.treatmentId ?? treatment.id,
          startTime: slot.start,
          salonId: slot.salonId ?? treatment.salon_id,
        },
      })

      if ('error' in result) {
        toast.error(friendlyBookingError(result.error ?? 'Nie udało się umówić wizyty.'))
        return
      }

      const start = new Date(slot.start)
      const dateLabel = format(start, 'EEEE, d MMMM yyyy', { locale: pl })
      const timeLabel = format(start, 'HH:mm')
      const bookingStatus = 'status' in result ? result.status : 'scheduled'
      const needsForms = bookingStatus === 'pending_forms'

      const requiredForms = (
        result as {
          requiredForms?: Array<{ id: string; title: string; token?: string; fillUrl?: string }>
        }
      ).requiredForms
      const forms: RequiredForm[] | undefined =
        requiredForms && requiredForms.length > 0
          ? requiredForms.map((form) => ({
              id: form.id,
              title: form.title,
              description: null,
              filled: (form as any).filled ?? false,
              token: form.token,
              fillUrl: form.fillUrl,
            }))
          : undefined

      setMessages((prev) => [
        ...prev,
        createMessage(
          'assistant',
          `Wizyta została umówiona na ${treatment.name} — ${dateLabel}, godz. ${timeLabel}.` +
            (needsForms
              ? ' Do pełnego potwierdzenia wizyty wymagane jest wypełnienie formularzy.'
              : ''),
          needsForms
            ? [
                {
                  id: `tool-booking-${nextMessageId}`,
                  name: 'bookingResult',
                  result: { status: bookingStatus, ...(forms ? { forms } : {}) },
                },
              ]
            : undefined,
        ),
      ])
      setPendingBooking(null)
      toast.success('Wizyta umówiona!')
      router.invalidate()
    } catch {
      toast.error('Nie udało się umówić wizyty. Spróbuj ponownie za chwilę.')
    } finally {
      setIsBooking(false)
    }
  }, [pendingBooking, isBooking, router])

  const handleCancelBooking = useCallback(() => {
    if (isBooking) return
    setPendingBooking(null)
  }, [isBooking])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Czat"
        description="Umawiaj wizyty, pytaj o zabiegi &mdash; asystent AI pomoże Ci w każdej sprawie."
      />
      <ChatContainer
        messages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
        isTyping={isTyping}
        onSend={handleSend}
        renderAfterMessage={(i) => (
          <>
            {messages[i].tools?.map((tool) => (
              <div key={tool.id}>
                {tool.name === 'searchTreatments' &&
                  tool.result.treatments &&
                  tool.result.treatments.length > 0 && (
                    <div className="mt-2">
                      <ChatTreatmentCard
                        treatments={tool.result.treatments}
                        onSelect={handleSelectTreatment}
                      />
                    </div>
                  )}
                {tool.name === 'findAvailableSlots' &&
                  tool.result.slots &&
                  tool.result.slots.length > 0 && (
                    <div className="mt-2">
                      <ChatSlotPicker
                        slots={tool.result.slots.map((s) => ({
                          ...s,
                          treatmentId:
                            s.treatmentId ??
                            tool.result.treatmentId ??
                            pendingSlotRef.current?.treatment.id,
                          salonId:
                            s.salonId ??
                            tool.result.salonId ??
                            pendingSlotRef.current?.treatment.salon_id,
                        }))}
                        onSelect={handleSelectSlot}
                      />
                    </div>
                  )}
                {tool.name === 'getRequiredForms' &&
                  tool.result.forms &&
                  tool.result.forms.length > 0 && (
                    <div className="mt-2">
                      <ChatRequiredFormsCard
                        forms={tool.result.forms}
                        onRequestForms={() =>
                          handleSend('Jakie formularze muszę wypełnić do wizyty?')
                        }
                      />
                    </div>
                  )}
                {tool.name === 'bookingResult' && tool.result.status === 'pending_forms' && (
                  <div className="mt-2">
                    <ChatRequiredFormsCard
                      status="pending_forms"
                      forms={tool.result.forms}
                      onRequestForms={() =>
                        handleSend('Jakie formularze muszę wypełnić do wizyty?')
                      }
                    />
                  </div>
                )}
                {tool.name === 'bookAppointment' && tool.result.error && (
                  <div className="mt-2">
                    <ChatBookingError message={tool.result.error} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      >
        {pendingBooking && (
          <div className="border-t border-border p-4">
            <ChatBookingSummary
              treatment={pendingBooking.treatment}
              slot={pendingBooking.slot}
              isBooking={isBooking}
              onConfirm={handleConfirmBooking}
              onCancel={handleCancelBooking}
            />
          </div>
        )}
        <ChatInput onSend={handleSend} disabled={isTyping || isBooking} />
      </ChatContainer>
    </div>
  )
}
