/* eslint-disable @typescript-eslint/no-unused-vars */


// This page is for selecting a template

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { Template } from '@/types/template'
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { s } from 'framer-motion/client'

export default function SelectTemplatePage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const { selectedTemplate, setSelectedTemplate, setInstagramHandle } = usePosterWizard()
    const { user } = useAuth()
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleNext = () => {
        if (selectedTemplate === null) {
            alert('No template selected');
            return
        } else {
            router.push('/generate/upload')
        }
    }

    const handleBack = () => {
        router.push('/account/dashboard')
    }

    // Load all templates
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true)
            const snapshot = await getDocs(query(collection(db, 'templates'), where('isActive', '==', true)));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template))
            setTemplates(data)
            setLoading(false)
        }
        fetchTemplates()

    }, [])

    // Fetch favorites when user is loaded
    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) return
            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)
            const data = userSnap.data()
            setFavoriteTemplates(data?.settings?.favouriteTemplates || [])
            setInstagramHandle(data?.instagramHandle || '')
        }
        fetchFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    // Toggle favorite
    const toggleFavorite = async (templateId: string) => {
        if (!user) return
        const userRef = doc(db, 'users', user.uid)
        const isFav = favoriteTemplates.includes(templateId)

        // Optimistically update the UI
        setFavoriteTemplates((prev) =>
            isFav ? prev.filter((id) => id !== templateId) : [...prev, templateId]
        )

        // 🔄 Firestore update runs in background
        try {
            await updateDoc(userRef, {
                'settings.favouriteTemplates': isFav
                    ? arrayRemove(templateId)
                    : arrayUnion(templateId)
            })
        } catch (err) {
            console.error('Failed to update favorite:', err)

            // Optional: Roll back if error occurs
            setFavoriteTemplates((prev) =>
                isFav ? [...prev, templateId] : prev.filter((id) => id !== templateId)
            )
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="p-8 max-w-xl mx-auto">

                <section id='templates'>
                    <h1 className="text-2xl font-bold mb-4">Select a Template</h1>
                    {loading ? <Spinner /> : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {templates.map((template) => (
                                <TemplateCard
                                    key={template.id}
                                    id={template.id}
                                    name={template.name}
                                    createdBy={template.createdBy}
                                    previewImageUrl={template.previewImageUrl}
                                    fontsUsed={template.fontsUsed}
                                    isSelected={selectedTemplate?.id === template.id}
                                    onSelect={() => setSelectedTemplate(template)}
                                    onToggleFavorite={() => toggleFavorite(template.id)}
                                    isFavorite={favoriteTemplates.includes(template.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <button onClick={handleBack} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-md">
                    Back
                </button>

                <button onClick={handleNext} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md">
                    Next Step
                </button>
            </div>
        </motion.div>
    )
}
