import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3–20 characters: letters, numbers, underscores only'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>

export const resetPasswordSchema = z.object({
  email: z.string().email(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
