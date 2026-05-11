'use client'

import { useActionState } from 'react'
import { signup, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { GoogleIcon } from '@/components/auth/google-icon'
import { TrustSignals } from '@/components/auth/trust-signals'
import { SecurityBadge } from '@/components/auth/security-badge'
import { PasswordInput } from '@/components/auth/password-input'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <SecurityBadge label="Secure sign up" />

      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Start bidding on BidLock in under a minute</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-sm font-medium text-slate-700">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              required
              className="h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150"
            />
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-slate-400">Use 8+ characters with a number and symbol</p>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-violet-600/20 transition-colors duration-150"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <Separator className="flex-1" />
          <span className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">or continue with</span>
          <Separator className="flex-1" />
        </div>

        <form action={signInWithGoogle}>
          <Button
            type="submit"
            variant="outline"
            className="w-full h-11 bg-white border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center justify-center gap-2.5"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <p className="text-sm text-center text-slate-600 mt-6">
          Have an account?{' '}
          <Link href="/auth/login" className="text-violet-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      <TrustSignals />
    </div>
  )
}
