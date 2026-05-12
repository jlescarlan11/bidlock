import { z } from 'zod'

export const profileSchema = z.object({
  username: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3–20 characters: letters, numbers, underscores only'),
  phone_number: z.string().min(1, 'Phone number is required').regex(/^09\d{9}$/, 'Must be in format 09XXXXXXXXX'),
  gcash_name: z.string().trim().min(2, 'GCash name must be at least 2 characters').max(60, 'GCash name must be 60 characters or fewer'),
})

export type ProfileInput = z.infer<typeof profileSchema>
