import { z } from 'zod'

export const messageSchema = z.object({
  body: z.string().min(1).max(1000),
  listing_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
})

export type MessageInput = z.infer<typeof messageSchema>
