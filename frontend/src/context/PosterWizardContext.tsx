'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Template } from '@/types/template'
import { Credit } from '@/types/credit'

type CarDetails = {
  make: string
  model: string
  year: string
}

type PosterWizardContextType = {
  state: PosterWizardState
  setState: React.Dispatch<React.SetStateAction<PosterWizardState>>
  selectedTemplate: Template | null
  setSelectedTemplate: (template: Template | null) => void
  userImgThumbDownloadUrl: string | null
  setuserImgThumbDownloadUrl: (url: string | null) => void
  userImgDownloadUrl: string | null
  setuserImgDownloadUrl: (url: string | null) => void
  carDetails: CarDetails
  setCarDetails: (details: CarDetails) => void
  prevCarDetails: CarDetails
  setPrevCarDetails: (details: CarDetails) => void
  description: string
  setDescription: (desc: string) => void
  instagramHandle: string
  setInstagramHandle: (handle: string) => void
  geminiChecked: boolean
  setGeminiChecked: (value: boolean) => void
  progress: string | null
  setProgress: (progress: string | null) => void
  templateIndex: number
  setTemplateIndex: (index: number) => void
  useAI: boolean
  setUseAI: (value: boolean) => void
  credits: Credit
  setCredits: React.Dispatch<React.SetStateAction<Credit>>
  hexValue: string
  setHexValue: (value: string) => void
  userPosterImgDownloadUrl: string | null
  setUserPosterImgDownloadUrl: (url: string | null) => void
  savedPosition: { x: number, y: number } | null
  setSavedPosition: React.Dispatch<React.SetStateAction<{ x: number, y: number } | null>>
  savedScale: number | null
  setSavedScale: React.Dispatch<React.SetStateAction<number | null>>
  savedRotation: number | null
  setSavedRotation: React.Dispatch<React.SetStateAction<number | null>>
  isSupporter: boolean
  setIsSupporter: (value: boolean) => void
  hasPackUnlocks: boolean
  setHasPackUnlocks: (value: boolean) => void
}

export type PosterWizardState = {
  selectedTemplate?: Template | null
  uploadedImageUrl?: string | null
  carDetails?: CarDetails
}

const PosterWizardContext = createContext<PosterWizardContextType | undefined>(undefined)

export const PosterWizardProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<PosterWizardState>({})
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [userImgDownloadUrl, setuserImgDownloadUrl] = useState<string | null>(null)
  const [userImgThumbDownloadUrl, setuserImgThumbDownloadUrl] = useState<string | null>(null)
  const [carDetails, setCarDetails] = useState<CarDetails>({ make: '', model: '', year: '' })
  const [description, setDescription] = useState('')
  const [prevCarDetails, setPrevCarDetails] = useState<CarDetails>({ make: '', model: '', year: '' })
  const [instagramHandle, setInstagramHandle] = useState('')
  const [geminiChecked, setGeminiChecked] = useState(false)
  const [progress, setProgress] = useState<string | null>('Starting...')
  const [templateIndex, setTemplateIndex] = useState(0)
  const [useAI, setUseAI] = useState(true)
  const [credits, setCredits] = useState<Credit>({ carJam: 0, ai: 0, posterGen: 0 })
  const [hexValue, setHexValue] = useState('')
  const [userPosterImgDownloadUrl, setUserPosterImgDownloadUrl] = useState<string | null>(null)

  const [savedPosition, setSavedPosition] = useState<{ x: number, y: number } | null>(null)
  const [savedScale, setSavedScale] = useState<number | null>(null)
  const [savedRotation, setSavedRotation] = useState<number | null>(null)

  const [isSupporter, setIsSupporter] = useState<boolean>(false)
  const [hasPackUnlocks, setHasPackUnlocks] = useState<boolean>(false)

  useEffect(() => {
    setState({
      selectedTemplate: selectedTemplate,
      uploadedImageUrl: userImgDownloadUrl,
      carDetails,
    })
  }, [selectedTemplate, userImgDownloadUrl, carDetails])

  return (
    <PosterWizardContext.Provider value={{
      state,
      setState,
      selectedTemplate,
      setSelectedTemplate,
      userImgDownloadUrl,
      setuserImgDownloadUrl,
      userImgThumbDownloadUrl,
      setuserImgThumbDownloadUrl,
      carDetails,
      setCarDetails,
      prevCarDetails,
      setPrevCarDetails,
      description,
      setDescription,
      instagramHandle,
      setInstagramHandle,
      geminiChecked,
      setGeminiChecked,
      progress,
      setProgress,
      templateIndex,
      setTemplateIndex,
      useAI,
      setUseAI,
      credits,
      setCredits,
      hexValue,
      setHexValue,
      userPosterImgDownloadUrl,
      setUserPosterImgDownloadUrl,
      savedPosition,
      setSavedPosition,
      savedScale,
      setSavedScale,
      savedRotation,
      setSavedRotation,
      isSupporter,
      setIsSupporter,
      hasPackUnlocks,
      setHasPackUnlocks
    }}>
      {children}
    </PosterWizardContext.Provider>
  )
}

export const usePosterWizard = () => {
  const context = useContext(PosterWizardContext)
  if (!context) throw new Error('usePosterWizard must be used within a PosterWizardProvider')
  return context
}

export function isStepAccessible(step: string, state: PosterWizardState): boolean {
  if (step === 'select') return !!state.uploadedImageUrl
  if (step === 'identify') return !!state.uploadedImageUrl
  if (step === 'overview') return !!state.carDetails && Object.values(state.carDetails).every(value => value !== '')
  return true
}
