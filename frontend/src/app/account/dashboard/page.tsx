'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Bebas_Neue } from "next/font/google";
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/client'
import { useState, useEffect } from 'react'

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });



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
    <div className="p-8 mx-auto">


      <div className="flex flex-col items-center border-4 border-blue-700 px-6 py-4">
        <h1 className={`text-6xl mb-4 text-blue-700 ${bebas.className}`}>
          POSTER APP
        </h1>
        <h1 className="text-xl font-bold text-gray-400">SICKSHOTS AI</h1>
      </div>

      <h1 className="mt-6 text-xl font-bold mb-4">
        Welcome, {displayName || user.email}
      </h1>

      {/* Button container */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-stretch gap-4 mb-2 w-full max-w-2xl mx-auto">
        <button
          onClick={() => {
            router.replace("/generate/upload");
          }}
          className="bg-blue-300 text-black px-4 py-2 rounded-xl flex flex-col items-center bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 flex-1"
        >
          <img className="w-9 h-9 mt-2 mb-1.5" src="/svg/add.svg" alt="addSVG" />
          Make Poster
        </button>

        <button
          onClick={() => {
            router.replace("/account/posters");
          }}
          className="bg-blue-300 text-black px-4 py-2 rounded-xl flex flex-col items-center bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 flex-1"
        >
          <img
            className="w-9 h-9 mt-2 mb-1.5"
            src="/svg/application.svg"
            alt="myPostersSVG"
          />
          My Posters
        </button>

        <button
          onClick={() => {
            router.replace("/account/settings");
          }}
          className="bg-blue-300 text-black px-4 py-2 rounded-xl flex flex-col items-center bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 flex-1"
        >
          <img
            className="w-9 h-9 mt-2 mb-1.5"
            src="/svg/setting.svg"
            alt="settingsSVG"
          />
          Account Settings
        </button>
        
      </div>


    </div>
  )
}