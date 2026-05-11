'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { TrustSignals } from '@/components/auth/trust-signals'
import { PasswordInput } from '@/components/auth/password-input'

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">New password</Label>
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
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </Button>
        </form>
      </div>

      <TrustSignals />
    </div>
  )
}
