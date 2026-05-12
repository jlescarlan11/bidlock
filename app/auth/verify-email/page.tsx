'use client'

import { useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { resendConfirmationEmail } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Mail } from 'lucide-react'
import Link from 'next/link'

const COOLDOWN_SECONDS = 60

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [state, action, pending] = useActionState(resendConfirmationEmail, undefined)
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Restart cooldown after a successful resend
  useEffect(() => {
    if (state?.success) setCooldown(COOLDOWN_SECONDS)
  }, [state])

  const disabled = pending || cooldown > 0

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] bg-card rounded-2xl border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">

        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
          <Mail className="h-6 w-6 text-blue-500" />
        </div>

        <h1 className="text-2xl font-semibold text-card-foreground mb-1.5">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-1">
          We sent a confirmation link to{' '}
          {email && <strong className="text-foreground">{email}</strong>}
          {!email && 'your email address'}
        </p>
        <p className="text-xs text-muted-foreground mb-6">The link expires in 24 hours.</p>

        <Separator className="mb-5" />

        <p className="text-sm text-muted-foreground mb-3">
          Didn&apos;t receive it? Check your spam folder or resend below.
        </p>

        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="outline"
            disabled={disabled}
            className="w-full h-11"
          >
            {disabled && cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
          </Button>
        </form>

        {state?.success && (
          <p className="text-sm text-center text-muted-foreground mt-3">Email sent!</p>
        )}
        {state?.error && (
          <p className="text-sm text-center text-destructive mt-3" role="alert">{state.error}</p>
        )}

        <p className="text-sm text-center text-muted-foreground mt-6">
          Wrong email?{' '}
          <Link href="/auth/signup" className="text-primary font-medium hover:underline">
            Back to sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
