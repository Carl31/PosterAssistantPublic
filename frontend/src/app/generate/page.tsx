// This is the main entry point for poster creation.

'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'

export default function GeneratePage() {
    // For uploading image
    const [image, setImage] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // For templates
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

    // For showing user's favorite templates
    const { user } = useAuth()
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])

    // Load all templates
    useEffect(() => {
        const fetchTemplates = async () => {
            const snapshot = await getDocs(collection(db, 'templates'))
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setTemplates(data)
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
        }
        fetchFavorites()
    }, [user])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImage(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    // Toggle favorite
    const toggleFavorite = async (templateId: string) => {
        if (!user) return
        const userRef = doc(db, 'users', user.uid)
        const isFav = favoriteTemplates.includes(templateId)

        await updateDoc(userRef, {
            'settings.favouriteTemplates': isFav
                ? arrayRemove(templateId)
                : arrayUnion(templateId)
        })

        setFavoriteTemplates((prev) =>
            isFav ? prev.filter((id) => id !== templateId) : [...prev, templateId]
        )
    }


    return (
        <div className="p-8 max-w-xl mx-auto">

            <section>
                <h1 className="text-2xl font-bold mb-4">Select a Template</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            id={template.id}
                            name={template.name}
                            createdBy={template.createdBy}
                            previewImageUrl={template.previewImageUrl}
                            fontsUsed={template.fontsUsed}
                            isSelected={selectedTemplate === template.id}
                            onSelect={() => setSelectedTemplate(template.id)}
                            onToggleFavorite={() => toggleFavorite(template.id)}
                            isFavorite={favoriteTemplates.includes(template.id)}
                        />
                    ))}
                </div>
            </section>

            <section>
                <h1 className="text-2xl font-bold mb-4">Upload Your Image</h1>

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mb-4"
                />

                {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="w-full rounded-xl shadow-lg" />
                )}
            </section>

        </div>
    )
}
