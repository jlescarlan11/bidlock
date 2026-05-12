'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/actions/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Message = {
  id: string
  body: string
  created_at: string
  sender_id: string
  profiles: { username: string | null } | null
}

type Props = {
  listingId: string
  recipientId: string
  userId: string
  initialMessages: Message[]
}

export default function ChatSection({ listingId, recipientId, userId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${listingId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...prev, { ...payload.new, profiles: null }]
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setPending(true)
    const fd = new FormData()
    fd.set('body', body)
    fd.set('listing_id', listingId)
    fd.set('recipient_id', recipientId)
    const result = await sendMessage(fd)
    setPending(false)
    if (!result?.error) setBody('')
  }

  return (
    <div className="border rounded-lg flex flex-col h-80">
      <div className="p-3 border-b font-semibold text-sm">Messages</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet. Start the conversation.</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-3 py-2 text-sm max-w-xs ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
          disabled={pending}
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>Send</Button>
      </form>
    </div>
  )
}
