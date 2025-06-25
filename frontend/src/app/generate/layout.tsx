import { PosterWizardProvider } from '@/context/PosterWizardContext'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  return (
    <PosterWizardProvider>
      <div className="">
        {children}
      </div>
    </PosterWizardProvider>
  )
}
