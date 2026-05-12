'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { TrustSignals } from '@/components/auth/trust-signals'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted flex flex-col items-center justify-center px-4 py-12 gap-6">
      <div className="w-full max-w-[420px] bg-card rounded-2xl border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        {state?.success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-card-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground mt-2">
                We've sent a password reset link to your email address. It expires in 1 hour.
              </p>
            </div>
            <Link href="/auth/login" className="text-sm text-primary hover:underline block pt-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-card-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link</p>
            </div>

            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 rounded-lg border-border bg-card focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary transition-colors duration-150"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive" role="alert">{state.error}</p>
              )}

              <Button
                type="submit"
                disabled={pending}
                className="w-full h-11 bg-primary hover:bg-primary/90 active:bg-primary/80 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-ring/20 transition-colors duration-150"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground mt-6">
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>

      <TrustSignals />
    </div>
  )
}
