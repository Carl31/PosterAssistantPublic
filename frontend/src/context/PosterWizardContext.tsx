'use client'

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
  image: File | null
  setImage: (file: File | null) => void
  previewUrl: string | null
  setPreviewUrl: (url: string | null) => void
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
  //   posterUrl: string | null
  //   setPosterUrl: (url: string | null) => void
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
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
      uploadedImageUrl: previewUrl,
      carDetails,
    });
  }, [selectedTemplate, previewUrl, carDetails]);

return (
  <PosterWizardContext.Provider value={{
    state: state,
    setState,
    selectedTemplate,
    setSelectedTemplate,
    image,
    setImage,
    previewUrl,
    setPreviewUrl,
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
    //   posterUrl,
    //   setPosterUrl,
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
  if (step === "upload") return !!state.selectedTemplate;
  if (step === "identify") return !!state.uploadedImageUrl;
  if (step === "overview") return !!state.carDetails && Object.values(state.carDetails).every((value) => value !== "");
  return true;
}