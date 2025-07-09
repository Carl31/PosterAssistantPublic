// /app/mockup/[id]/page.tsx

'use client'

import { db } from '@/firebase/client'
import { doc, getDoc } from 'firebase/firestore'
import { useSearchParams } from 'next/navigation';
import PosterPreview from '@/components/PosterPreview';
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react';
import LoadingPage from '@/components/LoadingPage';
import ErrorPage from '@/components/ErrorPage';
import { Suspense } from "react";

type UserData = {
  instagramHandle: string;
  displayName: string;
  settings: {
    displayMessage: string;
  };
}

export default function MockupPage() {
  return (
    <Suspense fallback={<LoadingPage text="Loading poster..." />}>
      <MockupContent />
    </Suspense>
  );
}

function MockupContent() {
  const searchParams = useSearchParams();
  const uid = searchParams!.get('uid');
  const posterId = searchParams!.get('posterId');
  const posterUrlParam = searchParams!.get('url');

  const qrCodeLink = `${process.env.PUBLIC_SITE_URL}/mockup?uid=${uid}&posterId=${posterId}` // for production

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posterNotFound, setPosterNotFound] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null)
  const [displayName, setdisplayName] = useState<string | null>(null)
  const [displayMessage, setDisplayMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!uid || !posterId) return

    // Get user properties
    const fetchUserData = async () => {
        const userData = await getUserData(uid);
        if (!userData) { return }
        setInstagramHandle(userData.instagramHandle);
        setdisplayName(userData.displayName);
        setDisplayMessage(userData.settings.displayMessage);
    }
    fetchUserData()


    if (posterUrlParam) {
      setPosterUrl(posterUrlParam) // faster load if posterUrl is already accessible from URL
      setLoading(false)
      return
    } else {
      // Get user posters
      const fetchPosterData = async () => {
        const docRef = doc(db, 'users', uid, 'posters', posterId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) { 
          const poster = docSnap.data()
          const posterUrl = poster.posterUrl
          
          try {
            const response = await fetch(posterUrl)
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            setPosterUrl(posterUrl)
          } catch (error) {
            console.error("Error loading poster:", error)
            setPosterUrl(null)
            setPosterNotFound(true)
          }

        } else {
          // alert('Poster not found')
          setPosterUrl(null)
          setPosterNotFound(true)
        }
        setLoading(false)
      }
      fetchPosterData()
    }


  }, [uid, posterId, posterUrlParam])

if (posterNotFound) return <ErrorPage text={`Poster with ID ${posterId} not found`} />;

  return (
    ((loading) ? (<LoadingPage text="Loading poster..." />) : (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Poster Mockup Preview</h1>
      <PosterPreview posterUrl={posterUrl!} />

      {/* {window.location.origin ? window.location.origin : window.location.protocol + '//' + window.location.host}/mockup/${posterUrl} */}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Scan this QR code to view:</h2>
        <QRCodeSVG
          value={qrCodeLink}
          size={256}
          level="L"
          bgColor="#ffffff"
          fgColor="#000000"
          marginSize={7}
          title="Scan me!"
        />
      </div>

      {/* Share button */}
      <button
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: "Check out my car poster!",
                url: qrCodeLink,
              });
            } catch (err) {
              console.error("Share failed:", err);
            }
          } else {
            await navigator.clipboard.writeText(qrCodeLink);
            alert("Link copied to clipboard!");
          }
        }}
        className="text-sm px-3 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
      >
        Share
      </button>

      {displayName !== null && instagramHandle !== null && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">User:</h2>
          <p>{displayMessage}</p>
          <a href={`https://www.instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer">
            <button className="text-sm px-3 py-1 rounded bg-purple-500 text-white hover:bg-purple-600">View Instagram Profile</button>
          </a>
        </div>
      )}
    </div>
    ))
  )

  // Utility functions:
  async function getUserData(uid: string): Promise<UserData | null> {
    const userDocRef = doc(db, 'users', uid);
    try {
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        return userData as UserData; // Return an object with name and ig properties
      } else {
        console.log("No such user user document exists:", uid);
        return null;
      }
    } catch (error) {
      console.error("Error getting user document:", error);
      return null;
    }
  }

}

// 'use client';

// import PosterPreview from '@/components/PosterPreview';
// import { useSearchParams } from 'next/navigation';

// export default function MockupPage() {
//   const searchParams = useSearchParams();
//   const posterUrl = searchParams!.get('url');

//   if (!posterUrl) return <p>Missing poster URL</p>;

//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold mb-4">Poster Mockup Preview</h1>
//       <PosterPreview posterUrl={posterUrl} />
//     </div>
//   );
// }
