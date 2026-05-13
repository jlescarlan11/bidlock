import { z } from 'zod'

const RESERVED_USERNAMES = new Set([
  'admin', 'me', 'api', 'users', 'auctions', 'listings', 'login', 'signup',
  'verify-email', 'callback', 'settings', 'notifications', 'search',
  'home', 'about', 'terms', 'privacy', 'support', 'help', '404', '500',
  'null', 'undefined', 'root', 'system',
])

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be 20 characters or fewer')
  .regex(/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine(v => !RESERVED_USERNAMES.has(v), 'That username is not available')

export const profileSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required').regex(/^09\d{9}$/, 'Must be in format 09XXXXXXXXX'),
  gcash_name: z.string().trim().min(2, 'GCash name must be at least 2 characters').max(60, 'GCash name must be 60 characters or fewer'),
  username: usernameSchema.optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
