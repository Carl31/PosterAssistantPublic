/* eslint-disable @next/next/no-img-element */
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
import Notification from "@/components/Notification";
import { notify } from "@/utils/notify";

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

  const qrCodeLink = `https://poster-assistant-public-frontend.vercel.app/mockup?uid=${uid}&posterId=${posterId}` // for production

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posterNotFound, setPosterNotFound] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null)
  // const [displayName, setdisplayName] = useState<string | null>(null)
  const [displayMessage, setDisplayMessage] = useState<string | null>(null)
  const [btnLink, setBtnLink] = useState('');

  useEffect(() => {
    if (!uid || !posterId) return

    // Get user properties
    const fetchUserData = async () => {
      const userData = await getUserData(uid);
      if (!userData) { return }
      setInstagramHandle(userData.instagramHandle);
      // setdisplayName(userData.displayName);
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
      <div className="px-4 bg-white">
        <Notification />
        {/* <h1 className="text-xl font-bold mb-4">Poster Mockup Preview</h1> */}


        <div className="flex flex-col items-center">
          <PosterPreview posterUrl={posterUrl!} onLinkGenerated={(link) => setBtnLink(link)} />

          {displayMessage !== null && instagramHandle !== null && (
            <p className="text-xs mb-4 text-center text-gray-900">{displayMessage}</p>
          )}


          <div className="relative w-full max-w-[256px] h-[29px] rounded-lg shadow-darker animate-bounce">
            <button className="relative w-full h-full overflow-hidden rounded-lg">
              <a
                href={`https://www.instagram.com/${instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="absolute inset-0 animate-btn" />
                <p className="relative text-xs font-bold text-center text-white mt-0.5">
                  <img
                    className="instagram-svg inline-block w-4 h-4 mr-2"
                    src="/svg/instagram_white.svg"
                    alt="instagramSVG"
                  />
                  View
                </p>
              </a>
            </button>
          </div>


          <div className="mt-28 w-full max-w-[155px] flex items-center justify-center border-[6px] border-black h-7 bg-[#080808]">
            <h5 className="text-[22px] leading-7 tracking-[-0.4px] text-white font-bold">
              Share
            </h5>
          </div>

          <div className="qr-code w-full max-w-[310px]">
            <QRCodeSVG
              value={qrCodeLink + "&utm_source=poster_assistant&utm_medium=qr"}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              marginSize={5}
              title="Scan me!"
              className="w-full h-auto"
            />
          </div>


          <button className="mb-5 relative border-3 border-black rounded-lg w-full max-w-[256px] h-[29px] overflow-hidden"
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.clipboard.writeText(qrCodeLink);
                  await navigator.share({
                    title: "Check out my car poster!",
                    url: qrCodeLink,
                  }).then(() => {
                    notify("info", "Link copied to clipboard!");
                  });
                } catch (err) {
                  console.error("Share failed:", err);
                  notify("error", "Share failed");
                }
              } else {
                await navigator.clipboard.writeText(qrCodeLink);
                notify("info", "Link copied to clipboard!");
              }
            }}>
            <div className="absolute inset-0 bg-white" />
            <p className="relative text-xs font-bold text-center text-gray-900">
              <img className="inline-block w-4 h-4 mr-2" src="/svg/copy.svg" alt="copySVG" />
              Share Link</p>
          </button>

          <button className="mb-14 relative border-3 border-black rounded-lg w-full max-w-[256px] h-[29px] overflow-hidden">
            <a
              href={btnLink}
              download="CoolPoster.png"
            >
              <div className="absolute inset-0 bg-white" />
              <p className="relative text-xs font-bold text-center text-gray-900 mt-0.5">
                <img className="inline-block w-4 h-4 mr-2" src="/svg/download.svg" alt="downloadSVG" />Download</p>
            </a>
          </button>

        </div>

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
