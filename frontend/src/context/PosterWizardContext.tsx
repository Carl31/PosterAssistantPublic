'use client'

// Used to share state between all generate/... pages.
// Also includes PosterWizardState to check if the state for each page is valid. If not, redirect to the previous page.

import React, { createContext, useContext, useState } from 'react'
import { Template } from '@/types/template'
import { useEffect } from 'react';

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
}

export type PosterWizardState = {
  selectedTemplate?: Template | null;
  uploadedImageUrl?: string | null;
  carDetails?: CarDetails;
  // Add more fields as needed to check if a step is accessible
};

const PosterWizardContext = createContext<PosterWizardContextType | undefined>(undefined)

export const PosterWizardProvider = ({ children }: { children: React.ReactNode }) => {

  const [state, setState] = useState<PosterWizardState>({});
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [userImgDownloadUrl, setuserImgDownloadUrl] = useState<string | null>(null)
  const [userImgThumbDownloadUrl, setuserImgThumbDownloadUrl] = useState<string | null>(null)
  const [carDetails, setCarDetails] = useState<CarDetails>({ make: '', model: '', year: '' })
  const [description, setDescription] = useState('')
  const [prevCarDetails, setPrevCarDetails] = useState<CarDetails>({ make: '', model: '', year: '' })
  const [instagramHandle, setInstagramHandle] = useState('')
  const [geminiChecked, setGeminiChecked] = useState(false)
  //const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>("Starting...")

  useEffect(() => {
    setState({
      selectedTemplate: selectedTemplate,
      uploadedImageUrl: userImgDownloadUrl,
      carDetails,
    });
  }, [selectedTemplate, userImgDownloadUrl, carDetails]);

return (
  <PosterWizardContext.Provider value={{
    state: state,
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
    setProgress
  }}>
    {children}
  </PosterWizardContext.Provider>
)
}

export const usePosterWizard = () => {
  const context = useContext(PosterWizardContext)
  if (!context) {
    throw new Error('usePosterWizard must be used within a PosterWizardProvider')
  }
  return context
}

export function isStepAccessible(step: string, state: PosterWizardState): boolean {
  if (step === "select") return !!state.uploadedImageUrl;
  if (step === "identify") return !!state.uploadedImageUrl;
  if (step === "overview") return !!state.carDetails && Object.values(state.carDetails).every((value) => value !== "");
  return true;
}