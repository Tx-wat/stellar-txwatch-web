'use client'

import { useEffect, useState } from 'react'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'

export default function OnboardingTour() {
  const tour = useOnboardingTour()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!tour.mounted || !tour.showTour) return

    const updateTargetRect = () => {
      const step = tour.steps[tour.currentStep]
      if (!step) return
      const element = document.querySelector(step.selector)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }

    updateTargetRect()
    const observer = new ResizeObserver(updateTargetRect)
    window.addEventListener('resize', updateTargetRect)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateTargetRect)
    }
  }, [tour.currentStep, tour.showTour, tour.mounted, tour.steps])

  if (!tour.mounted || !tour.showTour) return null

  const step = tour.steps[tour.currentStep]
  if (!step) return null

  const isLastStep = tour.currentStep === tour.steps.length - 1

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={tour.skipTour}
        aria-hidden="true"
      />

      {/* Spotlight around target element */}
      {targetRect && (
        <div
          className="fixed z-40 border-2 border-indigo-400 rounded-lg transition-all"
          style={{
            left: `${targetRect.left - 8}px`,
            top: `${targetRect.top - 8}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-50 bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-4 max-w-sm border border-zinc-200 dark:border-zinc-800"
        style={{
          left: targetRect ? `${Math.min(targetRect.left, window.innerWidth - 400)}px` : '50%',
          top: targetRect ? `${targetRect.bottom + 20}px` : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {step.title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {step.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {tour.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === tour.currentStep ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {tour.currentStep + 1} / {tour.steps.length}
            </span>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={tour.skipTour}
              className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Skip
            </button>
            {tour.currentStep > 0 && (
              <button
                type="button"
                onClick={tour.previousStep}
                className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={tour.nextStep}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
            >
              {isLastStep ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
