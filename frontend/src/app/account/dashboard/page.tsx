'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/client'
import { useState, useEffect, useRef } from 'react'
import { Credit } from '@/types/credit'
import Notification from '@/components/Notification'
import { notify } from '@/utils/notify'
import { addDoc, collection, serverTimestamp } from "firebase/firestore"

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
  const showFinalTutorialFlag = searchParams!.get('final') === 'true';

  const [tutorialStep, setTutorialStep] = useState<number | null>(
    showTutorialFlag ? 0 : (showFinalTutorialFlag ? 4 : null)
  )

  const createBtnRef = useRef<HTMLButtonElement | null>(null)
  const postersBtnRef = useRef<HTMLButtonElement | null>(null)
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null)

  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const openFeedback = (type: "bug" | "feature") => {
    setFeedbackType(type)
    setSubmitted(false)
    setFeedbackText("")
  }

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return

    await addDoc(collection(db, "feedback"), {
      type: feedbackType,          // "bug" | "feature"
      message: feedbackText,
      createdAt: serverTimestamp(),
      userId: user?.uid || null,
    })

    setSubmitted(true)
  }




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
      text: 'This is your account settings.\n\nWe’ll go there now so you can add your name and Instagram.',
      highlight: settingsBtnRef.current,
      onNext: () => router.replace('/account/settings/?final=true'),
    },
    {
      text: `You're all set!\n\nI hope you enjoy using SickShotsAI :)\n\n- Carlos`,
      highlight: null,
      onNext: () => setTutorialStep(null),
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
      router.push('/')
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
        <div className="flex flex-col items-center bg-white rounded-xl px-4 sm:px-6 py-6 w-full">
          <h1
            className={`text-4xl sm:text-5xl md:text-5xl lg:text-6xl mb-4 text-blue-400 text-center ${anton.className}`}
          >
            SICKSHOTS AI
          </h1>
          <h2 className="text-sm sm:text-base md:text-lg text-gray-800 text-center">
            Photos into posters in minutes.
          </h2>
        </div>
      </div>

      <h1 className="mt-6 text-xl font-bold mb-4 text-black">
        Welcome, {displayName || user.email}
      </h1>

      {/* Button container */}
      <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">

        {/* Make Poster */}
        <button
          onClick={() => {
            if (credits.posterGen <= 0) {
              const btn = document.getElementById("createPosterBtn");
              if (btn) {
                btn.classList.add("animate-shake");
                setTimeout(() => btn.classList.remove("animate-shake"), 500);
              }
            }
            handleCreatePoster();
          }}
          ref={createBtnRef}
          id="createPosterBtn"
          className="relative
      w-full
      inline-flex justify-center
      gap-3
      px-6 py-3
      text-sm font-semibold text-white
      rounded-lg
      bg-gradient-to-r from-cyan-500 to-blue-500
      hover:brightness-110
      focus:outline-none focus:ring-2 focus:ring-cyan-300
      transition
    "
        >
          <img className="absolute left-10 w-5 h-5" src="/svg/add_white.svg" alt="add" />
          <span className="text-center">Create</span>
        </button>

        <p className="text-xs text-gray-600 mx-auto mt-[-7px]">
          You have {credits.posterGen} poster credits left.
        </p>

        {/* My Posters */}
        <button
          onClick={() => router.replace("/account/posters")}
          ref={postersBtnRef}
          className="relative 
      w-full
      inline-flex items-center justify-center
      gap-3
      px-6 py-3
      text-sm font-semibold text-white
      rounded-lg
      bg-gradient-to-r from-cyan-500 to-blue-500
      hover:brightness-110
      focus:outline-none focus:ring-2 focus:ring-cyan-300
      transition
    "
        >
          <img className="absolute left-10 w-5 h-5" src="/svg/application_white.svg" alt="my posters" />
          <span className="text-center">Posters</span>
        </button>

        {/* Account Settings */}
        <button
          onClick={() => router.replace("/account/settings")}
          ref={settingsBtnRef}
          className="relative
      w-full
      inline-flex items-center justify-center
      gap-3
      px-6 py-3
      text-sm font-semibold text-white
      rounded-lg
      bg-gradient-to-r from-cyan-500 to-blue-500
      hover:brightness-110
      focus:outline-none focus:ring-2 focus:ring-cyan-300
      transition
    "
        >
          <img className="absolute left-10 w-5 h-5" src="/svg/setting_white.svg" alt="settings" />
          <span className="text-center">Settings</span>
        </button>


        {/* =========================
    FEEDBACK LINKS
   ========================= */}
        <div className="mt-10 flex justify-center gap-6 text-sm text-gray-500">
          <button
            onClick={() => openFeedback("bug")}
            className="hover:text-blue-500 underline underline-offset-4"
          >
            Report a bug
          </button>

          <button
            onClick={() => openFeedback("feature")}
            className="hover:text-blue-500 underline underline-offset-4"
          >
            Suggest a feature!
          </button>
        </div>



        {/* =========================
    FEEDBACK BOTTOM SHEET
   ========================= */}
        {feedbackType && (
          <div className="fixed inset-0 z-50 flex items-end bg-white/40 backdrop-blur-sm">
            {/* Click-away */}
            <div
              className="absolute inset-0"
              onClick={() => setFeedbackType(null)}
            />

            {/* Sheet */}
            <div className="
  relative p-6
  w-full
  h-[75vh]
  rounded-t-2xl
  bg-white
  shadow-[0_-10px_40px_rgba(0,0,0,0.15)]
  animate-slide-up
  flex flex-col
">
              {!submitted ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    {feedbackType === "bug" ? "Report a bug" : "Suggest a feature!"}
                  </h2>

                  <p className="text-sm text-gray-500 mb-4">
                    Short and specific is best.
                  </p>

                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={4}
                    placeholder="Type here…"
                    className="w-full text-gray-900 flex-1 resize-none rounded-lg border border-gray-300 p-3 text-sm
             focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  />

                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim()}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2
               text-white font-medium hover:brightness-110 disabled:opacity-40"
                  >
                    Submit
                  </button>
                </>
              ) : (
                <div className="py-8 text-center">
                  <h1 className="text-2xl font-bold text-black mb-2">Submitted</h1>
                  <p className="text-lg font-semibold text-gray-800">
                    Thank you for your help!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}



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
            <div className="bg-gray-700/50 backdrop-blur-sm border border-white rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]">
              {stepConfig[tutorialStep].text}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



