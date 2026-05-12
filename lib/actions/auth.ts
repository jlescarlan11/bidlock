'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema, resetPasswordSchema, updatePasswordSchema } from '@/lib/validators/auth'
import { env } from '@/lib/env'

export async function login(
  _prevState: { error: string } | undefined,
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid email or password format.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  redirect('/')
}

export async function signup(
  _prevState: { error: string } | undefined,
  formData: FormData,
) {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
  })
  if (!parsed.success) return { error: 'Please check your inputs.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { username: parsed.data.username },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })
  if (error) return { error: error.message }

  redirect(`/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}

export async function resendConfirmationEmail(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const email = formData.get('email')
  if (typeof email !== 'string' || !email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }

  return { success: true }
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) throw new Error(error.message)
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: 'Please enter a valid email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/update-password`,
  })
  if (error) return { error: error.message }

  return { success: true }
}

export async function updatePassword(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const parsed = updatePasswordSchema.safeParse({ password: formData.get('password') })
  if (!parsed.success) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your reset link has expired. Please request a new one.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }

  redirect('/')
}
