'use client'

import { useMemo, useState } from 'react'
import DetailsStep, { type PreviewDraft } from './steps/details-step'
import PhotosStep from './steps/photos-step'
import ReviewStep from './steps/review-step'
import { ListingPreviewCard } from '@/components/listings/listing-preview-card'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'

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
  const [previewDraft, setPreviewDraft] = useState<PreviewDraft>({
    title: '',
    starting_bid: 0,
    duration_days: 3,
  })
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | undefined>(undefined)

  const stepIndicator = useMemo(() => (
    <div className="flex gap-2 mb-6">
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
  ), [step])

  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-8">
      {step < 2 ? (
        <div className="max-w-[640px] mx-auto lg:max-w-none lg:grid lg:grid-cols-[480px_400px] lg:gap-12 lg:justify-center">
          {/* Left column */}
          <div>
            {stepIndicator}
            {step === 0 && (
              <>
                <FeeDisclosureCallout>
                  Listing fees are non-refundable once your auction goes live.
                </FeeDisclosureCallout>
                <DetailsStep
                  defaultValues={data}
                  onNext={(values) => { setData((d) => ({ ...d, ...values })); setStep(1) }}
                  onPreviewChange={setPreviewDraft}
                />
              </>
            )}
            {step === 1 && (
              <PhotosStep
                onBack={() => { setPreviewPhotoUrl(undefined); setStep(0) }}
                onNext={(photos) => { setData((d) => ({ ...d, photos })); setStep(2) }}
                onPhotosChange={(urls) => setPreviewPhotoUrl(urls[0])}
              />
            )}
          </div>

          {/* Right column — live preview */}
          <div className="mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden="true" />
                <p className="text-xs text-muted-foreground font-medium">Live preview</p>
              </div>
              <ListingPreviewCard {...previewDraft} photoUrl={previewPhotoUrl} />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                How your listing appears in the feed
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {stepIndicator}
          <ReviewStep
            data={data as WizardData}
            onBack={() => setStep(1)}
          />
        </div>
      )}
    </div>
  )
}
