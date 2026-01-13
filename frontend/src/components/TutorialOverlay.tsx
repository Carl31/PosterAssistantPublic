'use client';

import { useState, useRef } from 'react';
import { Anton } from 'next/font/google';
import { useRouter } from 'next/navigation';

const anton = Anton({
    weight: '400',        // required because Anton isn't a variable font
    subsets: ['latin'],   // choose the subsets you need
    display: 'swap',      // optional, helps with font rendering strategy
});


interface TutorialPage {
    title: string;
    subtitle: string;
    image: string;
    text: string;
    video: string;
}

const pages: TutorialPage[] = [
    { title: 'Welcome', subtitle: '', image: '/svg/house.svg', text: 'Your dashboard is your central workspace. From here you can create posters, manage your portfolio, and control your account.', video:"/mp4/app1.mp4" },
    { title: 'Start with a design', subtitle: 'After uploading an image, choose from several magazine-style templates.', image: '/svg/layers.svg', text: 'You can adjust the primary colour of each template to suit the car and image.', video:"/mp4/app2.mp4" },
    { title: 'Smart recognition', subtitle: 'Enter the car model yourself or let AI detect it automatically from the photo.', image: '/svg/chat-ai.svg', text: 'New Zealand users can also enable CarJam plate detection.', video:"/mp4/app3.mp4" },
    { title: 'Showcase your work', subtitle: 'Every poster gets its own clean showcase page, complete with a scannable QR code.', image: '/svg/qr-code.svg', text: 'Viewers can scan, see the poster and view your Instagram - add your handle to make this seamless.', video:"/mp4/app4.mp4" },
];

export default function TutorialOverlay() {
    const [step, setStep] = useState(0);
    const startX = useRef<number | null>(null);
    const router = useRouter();

    const handleTouchStart = (x: number) => {
        startX.current = x;
    };

    const handleTouchEnd = (x: number) => {
        if (startX.current === null) return;
        const delta = startX.current - x;
        if (delta > 50 && step < pages.length - 1) setStep(step + 1); // swipe up
        else if (delta < -50 && step > 0) setStep(step - 1);            // swipe down
        startX.current = null;
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-white overflow-hidden touch-none"
            onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
        >
            {/* Sliding track */}
            <div
                className="flex h-full w-full justify-between transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${step * 100}%)` }}
            >
                {pages.map((page, idx) => (
                    <div
                        key={idx}
                        className="
    min-w-full h-full
    flex flex-col items-center justify-center
    px-6 pt-16 pb-28
    text-center
    box-border
  "
                    >
                        {/* Title */}
                        <h1
                            className={`text-3xl font-bold mb-4 text-blue-400 ${anton.className}`}
                        >
                            {page.title}
                        </h1>

                        <div className="relative w-full h-1 mb-3">
                            <div className="absolute left-1/4 w-1/2 h-px bg-gray-200 rounded-full" />
                        </div>



                        {/* Subtext */}
                        <p className="text-sm text-gray-700 mb-6 max-w-sm">
                            {page.subtitle}
                        </p>

                        {/* Image
                        <div className="w-full max-w-md h-25 relative mb-6">
                            <img
                                src={page.image}
                                alt={page.title}
                                className="absolute left-0 top-0 w-full h-full object-contain"
                            />
                        </div> */}
                        {/* Video */}
                        <div className="w-full max-w-lg h-45 relative mb-6">
                            <video
                                src={page.video}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute left-0 top-0 w-full h-full object-contain"
                            />
                        </div>



                        {/* Bottom text */}


                        {idx === pages.length - 1 ? (
                            <p className="text-xs text-gray-500 max-w-sm mb-5">
                                <b>{page.text}</b>
                            </p>
                        ) :
                            <p className="text-xs text-gray-500 max-w-sm mb-5">
                                {page.text}
                            </p>}

                        {/* Continue button (last page only) */}
                        {idx === pages.length - 1 && (
                            <button
                                onClick={() => router.replace('/account/settings/?final=true')}
                                className="
        
       absolute bottom-17 items-center justify-center
        gap-3
        px-6 py-3
        text-sm font-semibold
        rounded-xl
        bg-white
        text-blue-500
        border border-blue-200
        shadow-lg
        hover:shadow-md
        hover:border-blue-300
        focus:outline-none focus:ring-2 focus:ring-blue-300/50
        transition-all
      "
                            >
                                <span className="text-center">Continue</span>
                            </button>
                        )}
                    </div>

                ))}
            </div>

            {/* Progress bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-2 bg-gray-200/70 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    style={{
                        width: `${((step + 1) / pages.length) * 100}%`,
                    }}
                />
            </div>

        </div>
    );



}
