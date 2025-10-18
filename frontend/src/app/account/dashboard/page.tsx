'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/client'
import { useState, useEffect } from 'react'

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

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      if (!user) return
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const data = userSnap.data()
      // console.log(data)
      setDisplayName(data?.displayName || []) // if needing more user data, fetch it here too.
      setLoading(false)
    }
    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user || loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-3xl">
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
      <div className="flex flex-col gap-4 mb-2 w-full max-w-2xl mx-auto">
        <button
          onClick={() => router.replace("/generate/upload")}
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
        >
          <span className="relative w-full px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent flex flex-col items-center">
            <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/add.svg" alt="addSVG" />
            Make Poster
          </span>
        </button>

        <button
          onClick={() => router.replace("/account/posters")}
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
        >
          <span className="relative w-full px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent flex flex-col items-center">
            <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/application.svg" alt="myPostersSVG" />
            My Posters
          </span>
        </button>

        <button
          onClick={() => router.replace("/account/settings")}
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
        >
          <span className="relative w-full px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent flex flex-col items-center">
            <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/setting.svg" alt="settingsSVG" />
            Account Settings
          </span>
        </button>
      </div>



    </div>
  )
}