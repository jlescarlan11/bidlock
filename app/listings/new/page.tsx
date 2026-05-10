'use client'

import { useState } from 'react'
import DetailsStep from './steps/details-step'
import PhotosStep from './steps/photos-step'
import ReviewStep from './steps/review-step'

export type WizardData = {
  title: string
  description: string
  starting_bid: number
  duration_days: number
  photos: File[]
}

const STEPS = ['Details', 'Photos', 'Review']

export default function NewListingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<WizardData>>({})

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'font-semibold' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Listing fees are non-refundable once your auction goes live.
      </p>

      {step === 0 && (
        <DetailsStep
          defaultValues={data}
          onNext={(values) => { setData((d) => ({ ...d, ...values })); setStep(1) }}
        />
      )}
      {step === 1 && (
        <PhotosStep
          onBack={() => setStep(0)}
          onNext={(photos) => { setData((d) => ({ ...d, photos })); setStep(2) }}
        />
      )}
      {step === 2 && (
        <ReviewStep
          data={data as WizardData}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}
