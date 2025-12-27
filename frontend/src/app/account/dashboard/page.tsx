'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/client'
import { useState, useEffect, useRef } from 'react'
import { Credit } from '@/types/credit'
import Notification from '@/components/Notification'
import { notify } from '@/utils/notify'

import { Anton } from 'next/font/google';
const anton = Anton({
  weight: '400',        // required because Anton isn't a variable font
  subsets: ['latin'],   // choose the subsets you need
  display: 'swap',      // optional, helps with font rendering strategy
});



export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [credits, setCredits] = useState({} as Credit)


  const searchParams = useSearchParams();
  const showTutorialFlag = searchParams!.get('signup') === 'true';

  const [tutorialStep, setTutorialStep] = useState<number | null>(
    showTutorialFlag ? 0 : null
  )

  const createBtnRef = useRef<HTMLButtonElement | null>(null)
  const postersBtnRef = useRef<HTMLButtonElement | null>(null)
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null)

  const getHighlightStyle = (el: HTMLElement | null) => {
    if (!el) return {}
    const r = el.getBoundingClientRect()
    return {
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    }
  }

  const stepConfig = [
    {
      text: 'Hey! Welcome to SickShotsAI.\nTap anywhere for a quick walk-through.',
      highlight: null,
      onNext: () => setTutorialStep(1),
    },
    {
      text: 'This is how you make posters.',
      highlight: createBtnRef.current,
      onNext: () => setTutorialStep(2),
    },
    {
      text: 'This is where you see your poster library.',
      highlight: postersBtnRef.current,
      onNext: () => setTutorialStep(3),
    },
    {
      text: 'This is your account settings.\nWe’ll go there now so you can add your name and Instagram.',
      highlight: settingsBtnRef.current,
      onNext: () => router.replace('/account/settings'),
    },
  ]


  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      if (!user) return
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const data = userSnap.data()
      setCredits(data?.credits)
      // console.log(data)
      setDisplayName(data?.displayName || []) // if needing more user data, fetch it here too.
      setLoading(false)
    }
    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleCreatePoster = async () => {
    if (!user) {
      router.push('/login')
    }

    console.log("Credits:", credits)
    if (credits.posterGen <= 0) {
      notify('error', 'You have no poster credits left.')
      return
    } else if (credits.posterGen > 0) {
      //alert("You have " + credits.posterGen + " credits left.")
    }

    router.push('/generate/upload')
  }

  if (!user || loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-3xl">
      <Notification />
      <div
        className="flex flex-col items-center 
    relative 
    p-[4px] 
    bg-gradient-to-br from-cyan-500 to-blue-500
    rounded-2xl mt-4"
      >
        <div className="flex flex-col items-center bg-gray-900 rounded-xl px-4 sm:px-6 py-6 w-full">
          <h1
            className={`text-4xl sm:text-5xl md:text-5xl lg:text-6xl mb-4 text-blue-400 text-center ${anton.className}`}
          >
            SICKSHOTS AI
          </h1>
          <h2 className="text-sm sm:text-base md:text-lg text-gray-400 text-center">
            Photos into posters in minutes.
          </h2>
        </div>
      </div>

      <h1 className="mt-6 text-xl font-bold mb-4">
        Welcome, {displayName || user.email}
      </h1>

      {/* Button container */}
      <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
        <button
          onClick={() => {
            if (credits.posterGen <= 0) {
              const btn = document.getElementById("createPosterBtn");
              if (btn) {
                btn.classList.add("animate-shake");
                setTimeout(() => btn.classList.remove("animate-shake"), 500);
              }
            }
            handleCreatePoster()
            
          }}
          ref={createBtnRef}
          id="createPosterBtn"
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
        >
          <span className="relative w-full px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent flex flex-col items-center">
            <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/add.svg" alt="addSVG" />
            Make Poster
          </span>
        </button>
        <p className="text-xs text-gray-300 mx-auto">
          You have {credits.posterGen} poster credits left.
        </p>

        <button
          onClick={() => router.replace("/account/posters")}
          ref={postersBtnRef}
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
        >
          <span className="relative w-full px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent flex flex-col items-center">
            <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/application.svg" alt="myPostersSVG" />
            My Posters
          </span>
        </button>

        <button
          onClick={() => router.replace("/account/settings")}
          ref={settingsBtnRef}
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
        >
          <span className="relative w-full px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent flex flex-col items-center">
            <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/setting.svg" alt="settingsSVG" />
            Account Settings
          </span>
        </button>
      </div>

      {tutorialStep !== null && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => stepConfig[tutorialStep].onNext()}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Highlight cutout */}
          {stepConfig[tutorialStep].highlight && (
            <div
              className="absolute rounded-xl border-2 border-cyan-400 pointer-events-none"
              style={getHighlightStyle(stepConfig[tutorialStep].highlight)}
            />
          )}

          {/* Text */}
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="bg-gray-900 border border-cyan-500 rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line">
              {stepConfig[tutorialStep].text}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



