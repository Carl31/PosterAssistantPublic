
'use client'

import { useRouter } from 'next/navigation'
import { Archivo_Black } from "next/font/google";
const archivoBlack = Archivo_Black({
    weight: "400", // Archivo Black only has 400
    subsets: ["latin"],
});


export default function PricingPage() {

    const router = useRouter()


    const tiers = [
        {
            name: "Newbie",
            price: "FREE",
            subtitle: "One-time starter",
            features: [
                "3 credits (one-time)",
                "Standard quality (720p)",
                "25 basic templates",
                "5 AI calls",
                "No Carjam requests",
                "Standard queue (10–15s)",
                "No rollover credits",
                "Top-ups not available",
            ],
            cta: "Get Started",
            highlighted: false,
        },
        {
            name: "Photographer",
            price: "$9 / month",
            badge: "Most Popular",
            subtitle: "Best value",
            features: [
                "10 credits / month",
                "High quality (1080p, print-ready)",
                "50+ premium templates",
                "25 AI calls",
                "3 Carjam requests",
                "Fast queue (5–8s)",
                "3 rollover credits",
                "40% off top-ups",
            ],
            cta: "Choose Photographer",
            highlighted: true,
        },
        {
            name: "Pro",
            price: "$23 / month",
            subtitle: "Maximum output",
            features: [
                "30 credits / month",
                "Ultra HD (4K)",
                "All 100+ templates",
                "100 AI calls",
                "15 Carjam requests",
                "Priority queue (1–3s)",
                "10 rollover credits",
                "70% off top-ups",
            ],
            cta: "Go Pro",
            highlighted: false,
        },
    ];

    return (
        <div className="max-w-6xl mx-auto px-2 pb-16 pt-6">
            <div
                className="flex flex-col items-center 
    relative 
    p-[4px] 
    bg-gradient-to-br from-cyan-500 to-blue-500
    rounded-2xl mb-4"
            > <div className="flex flex-col items-center bg-white rounded-xl px-4 sm:px-6 py-6 w-full">
                    <h1 className={`text-3xl font-bold text-center text-blue-500 ${archivoBlack.className}`}>Credit Packs</h1>
                    <p className="mt-2 text-sm text-gray-500"><b>Coming soon.</b></p>
                </div>
            </div>
            <p className="text-sm text-gray-500">
                In the meantime, if you need more credits, please message me on instagram.
            </p>

            <button className="mt-4 relative w-full h-full overflow-hidden rounded-lg">
                <a
                    href={`https://www.instagram.com/sickshotsnz`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <div className="absolute inset-0 animate-btn" />
                    <p className="relative text-s font-bold text-center text-white mt-1 mb-1 mx-2.5">
                        <img
                            className="instagram-svg inline-block w-4 h-4 mr-2"
                            src="/svg/instagram_white.svg"
                            alt="instagramSVG"
                        />
                        Message me!
                    </p>
                </a>
            </button>

            <button
                onClick={() => router.replace('/account/dashboard')}
                className="bottom-4 left-1/2 mt-10 transform px-5 py-2 rounded-lg   bg-white text-gray-800 shadow-md
                border border-gray-200
                hover:bg-gray-50
                disabled:opacity-50"
            >
                Back
            </button>


        </div>
    );
}
