import { z } from 'zod'

export const profileSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters').max(60, 'Display name must be 60 characters or fewer'),
  phone_number: z.string().min(1, 'Phone number is required').regex(/^09\d{9}$/, 'Must be in format 09XXXXXXXXX'),
  gcash_name: z.string().trim().min(2, 'GCash name must be at least 2 characters').max(60, 'GCash name must be 60 characters or fewer'),
})

export type ProfileInput = z.infer<typeof profileSchema>
