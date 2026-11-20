'use client'

import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export interface TourStep {
  id: string
  title: string
  description: string
  selector: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'add-contract',
    title: 'Add Your First Contract',
    description: 'Click "Add Contract" to register a Soroban contract for monitoring',
    selector: '[data-tour-add-contract]',
  },
  {
    id: 'configure-rules',
    title: 'Configure Alert Rules',
    description: 'Set up rules to trigger alerts on specific contract events',
    selector: '[data-tour-configure-rules]',
  },
  {
    id: 'test-webhook',
    title: 'Test Your Webhook',
    description: 'Send a test payload to verify your webhook endpoint is working',
    selector: '[data-tour-test-webhook]',
  },
]

export function useOnboardingTour() {
  const [isCompleted, setIsCompleted] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const completed = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
    setIsCompleted(!!completed)
    setShowTour(!completed)
  }, [])

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true')
    setIsCompleted(true)
    setShowTour(false)
  }

  const skipTour = () => {
    completeTour()
  }

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return {
    mounted,
    showTour,
    isCompleted,
    currentStep,
    steps: TOUR_STEPS,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
  }
}
