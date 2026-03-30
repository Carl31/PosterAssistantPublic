export type Template = {
  id: string
  name: string
  psdFileUrl: string
  fontsUsed: string[]
  previewImageUrl: string
  createdBy: string
  isActive: boolean
  supportedTexts: string[]
  style: string
  hexElements: string[]
  previewHexUrl: string
  accentColourSelect?: boolean
  previewHexAccentUrl?: string
  previewHexAccentReverseUrl?: string
  accentHexElements?: string[]
  alignSelect?: boolean
  alignDefault?: 'left' | 'right'
  psdFileReverseUrl?: string
  previewHexReverseUrl?: string
  previewImageReverseUrl?: string

  // etc. Can add more here if wanting to use them on this page.
}