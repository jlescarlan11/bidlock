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
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        {state?.success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center">
                <Mail className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Check your email</h1>
              <p className="text-sm text-slate-500 mt-2">
                We've sent a password reset link to your email address. It expires in 1 hour.
              </p>
            </div>
            <Link href="/auth/login" className="text-sm text-violet-600 hover:underline block pt-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
              <p className="text-sm text-slate-500 mt-1">Enter your email and we'll send you a reset link</p>
            </div>

            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive" role="alert">{state.error}</p>
              )}

              <Button
                type="submit"
                disabled={pending}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-violet-600/20 transition-colors duration-150"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
              </Button>
            </form>

            <p className="text-sm text-center text-slate-600 mt-6">
              <Link href="/auth/login" className="text-violet-600 font-medium hover:underline">
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
