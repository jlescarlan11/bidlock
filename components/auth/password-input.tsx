'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordInputProps {
  id: string
  name: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  className?: string
}

export function PasswordInput({ id, name, required, minLength, autoComplete, className }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={cn('pr-10 h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150', className)}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
