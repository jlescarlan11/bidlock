import { z } from 'zod'

export const profileSchema = z.object({
  display_name: z.string().min(2).max(60),
  phone_number: z.string().regex(/^09\d{9}$/, 'Must be in format 09XXXXXXXXX'),
  gcash_name: z.string().min(2).max(60),
})

export type ProfileInput = z.infer<typeof profileSchema>
