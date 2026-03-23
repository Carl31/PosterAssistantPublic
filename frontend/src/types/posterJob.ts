/**
 * Body for POST /api/startPosterJob — keep in sync with
 * `pages/api/startPosterJob.ts` and `handleGeneratePoster` on the overview page.
 */
export type StartPosterJobBody = {
  userId: string
  token: string
  jobId: string
  psdUrl: string | undefined
  templateId: string | undefined
  userImageUrl: string | null | undefined
  carDetails: { make: string; model: string; year: string }
  description: string
  instagramHandle: string
  fontsUsed: string[] | undefined
  supportedTexts: string[] | undefined
  hexColour: string
  hexElements: string[] | undefined
  accentHexValue: string | null
  accentHexElements: string[] | undefined
  psdFileReverseUrl: string | undefined
  alignDefault: 'left' | 'right' | undefined
  alignChosen: 'left' | 'right' | null
}
