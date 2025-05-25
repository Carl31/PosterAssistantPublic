// Card to show poster templates to the user (and some of the template information)

'use client'

type TemplateProps = {
    id: string
    name: string
    createdBy: string
    previewImageUrl: string
    fontsUsed: string[]
    isSelected: boolean
    onSelect: () => void
    isFavorite: boolean
    onToggleFavorite: () => void
}

export default function TemplateCard({
    id,
    name,
    createdBy,
    previewImageUrl,
    fontsUsed,
    isSelected,
    onSelect,
    isFavorite,
    onToggleFavorite
}: TemplateProps) {
    return (
        <div
            onClick={onSelect}
            className={`border p-4 rounded-xl shadow-md cursor-pointer transition hover:scale-105 ${isSelected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-300'
                }`}
        >
            <img src={previewImageUrl} alt={name} className="rounded-md mb-2" />
            <h2 className="font-bold">{name}</h2>
            <p className="text-xs text-gray-600">Created by: {createdBy}</p>
            <p className="text-xs text-gray-600">Fonts: {fontsUsed.join(', ')}</p>

            <div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite()
                    }}
                    className=" text-xl"
                >
                    {isFavorite ? '❤️' : '🤍'}
                </button>
            </div>

        </div>
    )
}
