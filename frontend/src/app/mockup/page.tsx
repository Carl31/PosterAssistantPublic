/* eslint-disable @next/next/no-img-element */
// /app/mockup/[id]/page.tsx

'use client'

import { db } from '@/firebase/client'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { useSearchParams } from 'next/navigation';
import PosterPreview from '@/components/PosterPreview';
import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react';
import LoadingPage from '@/components/LoadingPage';
import ErrorPage from '@/components/ErrorPage';
import { Suspense } from "react";
import { notify } from "@/utils/notify";
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuth } from '@/context/AuthContext';

type CustomButton = {
  id: string
  name: string
  link: string
  color: string
}


type UserData = {
  instagramHandle: string;
  displayName: string;
  settings: {
    displayMessage: string;
    customButtons?: CustomButton[];
    removeIgButton?: boolean;
  };
  hasPackUnlocks: boolean
}

const COLOR_OPTIONS = [
  { label: 'Blue', value: 'bg-blue-500' },
  { label: 'Sky', value: 'bg-sky-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Violet', value: 'bg-violet-500' },
  { label: 'Purple', value: 'bg-purple-500' },
  { label: 'Fuchsia', value: 'bg-fuchsia-500' },
  { label: 'Pink', value: 'bg-pink-500' },
  { label: 'Rose', value: 'bg-rose-500' },
  { label: 'Red', value: 'bg-red-500' },
  { label: 'Orange', value: 'bg-orange-500' },
  { label: 'Amber', value: 'bg-amber-500' },
  { label: 'Yellow', value: 'bg-yellow-500' },
  { label: 'Lime', value: 'bg-lime-500' },
  { label: 'Green', value: 'bg-green-500' },
  { label: 'Black', value: 'bg-black' },
  { label: 'Gray', value: 'bg-gray-500' },
]



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

  const qrCodeLink = `https://www.sickshotsnz.app/mockup?uid=${uid}&posterId=${posterId}` // for production

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posterNotFound, setPosterNotFound] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null)
  // const [displayName, setdisplayName] = useState<string | null>(null)
  const [displayMessage, setDisplayMessage] = useState<string | null>(null)
  const [btnLink, setBtnLink] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  const [dontShowAgainGuide, setDontShowAgainGuide] = useState(false);
  const [showGuidePopup, setShowGuidePopup] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuth()

  const [customButtons, setCustomButtons] = useState<CustomButton[]>([])
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [editingButton, setEditingButton] = useState<CustomButton | null>(null)


  const [nameInput, setNameInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [selectedColor, setSelectedColor] = useState('bg-blue-500')

  const [showDeleteIgPopup, setShowDeleteIgPopup] = useState(false)
  const [removeIgButton, setRemoveIgButton] = useState(false)

  const [hasPackUnlocks, setHasPackUnlocks] = useState(false)

  const HOLD_DELAY = 600
  const MOVE_THRESHOLD = 10 // px

  const startPosRef = useRef<{ x: number; y: number } | null>(null)


  useEffect(() => {
    const auth = getAuth()

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User is signed in on this device:', user.uid)
        setIsSignedIn(true)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (editingButton) {
      setNameInput(editingButton.name)
      setLinkInput(editingButton.link)
      setSelectedColor(editingButton.color)
    } else {
      setNameInput('')
      setLinkInput('')
      setSelectedColor('bg-blue-500')
    }
  }, [editingButton])

  useEffect(() => {
    if (isEditMode) {
      document.body.classList.add('edit-mode');
    } else {
      document.body.classList.remove('edit-mode');
    }
  }, [isEditMode]);

  const handleExitEditMode = async () => {
    if (!user) return

    const userRef = doc(db, 'users', user.uid)

    if (hasPackUnlocks) {
      await updateDoc(userRef, {
        'settings.displayMessage': displayMessage,
        'settings.customButtons': customButtons,
      })
    }

    setIsEditMode(false)
  }

  const startHold = (e: React.PointerEvent | React.TouchEvent) => {
    if (!isSignedIn) return

    const point =
      'touches' in e ? e.touches[0] : (e as React.PointerEvent)

    startPosRef.current = { x: point.clientX, y: point.clientY }

    holdTimerRef.current = setTimeout(() => {
      setIsEditMode(true)
    }, HOLD_DELAY)
  }

  const moveHold = (e: React.PointerEvent | React.TouchEvent) => {
    if (!startPosRef.current || !holdTimerRef.current) return

    const point =
      'touches' in e ? e.touches[0] : (e as React.PointerEvent)

    const dx = Math.abs(point.clientX - startPosRef.current.x)
    const dy = Math.abs(point.clientY - startPosRef.current.y)

    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const endHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    startPosRef.current = null
  }

  const handleCloseGuidePopup = async () => {
    setShowGuidePopup(false);

    if (dontShowAgainGuide && user?.uid) {
      await updateDoc(doc(db, "users", user.uid), {
        "settings.hideGuidePopup": true,
      });
    }

  };


  // Fetch favorites when user is loaded
  useEffect(() => {
    if (!user) return

    const userRef = doc(db, 'users', user.uid)

    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data()

      if (!data?.settings?.hideGuidePopup) {
        setShowGuidePopup(true)
      }
    })

    return unsubscribe
  }, [user])


  useEffect(() => {
    if (!uid || !posterId) return

    // Get user properties
    const fetchUserData = async () => {
      const userData = await getUserData(uid);
      if (!userData) { return }
      setInstagramHandle(userData.instagramHandle);
      // setdisplayName(userData.displayName);
      setDisplayMessage(userData.settings.displayMessage);
      setRemoveIgButton(userData.settings.removeIgButton || false);

      setHasPackUnlocks(userData.hasPackUnlocks);

      if (userData.settings.customButtons) {
        setCustomButtons(userData.settings.customButtons);
      } else {
        setCustomButtons([]); // default empty array
      }
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


  if (posterNotFound) return <ErrorPage text={`Poster with ID ${posterId} not found!`} />;

  return (
    ((loading) ? (<LoadingPage text="Loading poster..." />) : (
      <div className={`px-4 bg-white transition-transform duration-300 ${isEditMode
        ? 'scale-[0.95] rounded-2xl bg-blue-500 overflow-hidden shadow-2xl'
        : 'scale-100 bg-white'}`}>
        {/* <h1 className="text-xl font-bold mb-4">Poster Mockup Preview</h1> */}


        <div className="flex flex-col items-center" onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('.popup-content')) {
            if (showPopup === true) {
              setShowPopup(false);
              console.log('popup closed')
            }
          }
        }}>

          {showPopup && !isEditMode && (
            <div className="fixed inset-0 z-50 flex items-end justify-center
                  backdrop-blur-sm bg-black/60 fade-in">
              <div className="w-full max-w-sm p-4 mx-4 mb-20
                    popup-content rounded-lg
                    min-h-50 text-center bg-gray-100">
                <div className="mb-4">


                  <img src="/svg/xmark_gray.svg" alt="Close" className="relative top-3 right-3 w-6 h-6 cursor-pointer float-right" onClick={() => setShowPopup(false)} />
                  <div className="rounded-lg w-full h-70 bg-image bg-cover bg-center" style={{ backgroundImage: `url('/png/print.png')` }}></div>
                  <h5 className=" mt-5 text-[22px] font-bold mb-2 text-black">Want to print?</h5>
                  <button className="mt-4 relative w-full h-full overflow-hidden rounded-lg">
                    <a
                      href={`https://www.instagram.com/${instagramHandle}`}
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
                        Message me for the high-res file!
                      </p>
                    </a>
                  </button>
                  <p className="mt-6 text-gray-900 mb-6">
                    OR
                  </p>
                  <a
                    className=" mb-10 text-black rounded"
                    href={btnLink}
                    download="CoolPoster.png"
                  >
                    <u>Download normal quality</u>
                  </a>
                </div>
              </div>
            </div>
          )}


          <div
            onPointerDown={startHold}
            onPointerMove={moveHold}
            onPointerUp={endHold}
            onPointerCancel={endHold}
          >
            <PosterPreview
              posterUrl={posterUrl!}
              onLinkGenerated={(link) => setBtnLink(link)}
            />
          </div>

          {displayMessage !== null && instagramHandle !== null && (
            isEditMode ? (
              <textarea
                className="text-xs mb-2 text-center text-gray-900 border border-black rounded p-2 w-full max-w-xs"
                value={displayMessage}
                onChange={(e) => {
                  if (!hasPackUnlocks) {
                    notify('error', 'Visit the store to unlock customisations.');
                    return;
                  }
                  setDisplayMessage(e.target.value);
                }}
              />
            ) : (
              <p className="text-xs mb-4 text-center text-gray-900 mx-5">
                {displayMessage}
              </p>
            )
          )}



          {!removeIgButton && (
            <div className="relative w-full max-w-[256px] h-[29px] rounded-lg shadow-darker animate-bounce mt-2">
              {/* Minus button in edit mode */}
              {isEditMode && !removeIgButton && (
                <button
                  className="absolute -top-1 -right-5 text-red-600 text-lg font-bold"
                  onClick={() => {
                    if (!hasPackUnlocks) {
                      notify('error', 'Visit the store to unlock customisations.');
                      return
                    }
                    setShowDeleteIgPopup(true)
                  }}
                >
                  −
                </button>
              )}

              {/* Instagram link/button */}
              {!removeIgButton && (
                <a
                  href={!isEditMode ? `https://www.instagram.com/${instagramHandle}` : undefined}
                  target={!isEditMode ? "_blank" : undefined}
                  rel={!isEditMode ? "noopener noreferrer" : undefined}
                  className={`relative w-full h-full overflow-hidden rounded-lg block ${isEditMode ? 'pointer-events-none' : ''
                    }`}
                >
                  <div className="absolute inset-0 animate-btn" />
                  <p className="relative text-xs font-bold text-center text-white mt-1.5">
                    <img
                      className="instagram-svg inline-block w-4 h-4 mr-2"
                      src="/svg/instagram_white.svg"
                      alt="instagramSVG"
                    />
                    View
                  </p>
                </a>
              )}
            </div>
          )}



          {customButtons.map((btn) => (
            <div
              key={btn.id}
              className="relative w-full max-w-[256px] h-[29px] mt-4 rounded-lg shadow-darker"
            >
              <a
                onClick={(e) => {
                  if (isEditMode) {
                    e.preventDefault()
                    setEditingButton(btn)
                    setShowAddPopup(true)
                  }
                }}
                href={!isEditMode ? btn.link : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full h-full overflow-hidden rounded-lg block"
              >
                <div className={`absolute inset-0 ${btn.color}`} />
                <p className="relative text-xs font-bold text-center text-white mt-1.5">
                  {btn.name}
                </p>
              </a>

              {isEditMode && (
                <button
                  onClick={() =>
                    setPendingDeleteId(btn.id)}
                  className="absolute -top-1 -right-5 text-red-600 text-lg font-bold"
                >
                  −
                </button>
              )}
            </div>

          ))}



          {isEditMode && (
            <button
              className="mt-3 w-10 h-10 rounded-full border-2 border-black text-xl font-bold text-black"
              onClick={() => {
                if (!hasPackUnlocks) {
                  notify('error', 'Visit the store to unlock customisations.');
                  return;
                }
                setShowAddPopup(true);
              }}

            >
              +
            </button>
          )}


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
              if (isEditMode) return
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
              Share link</p>
          </button>

          {/* Below was used to open popup content to download or message me for full res file */}
          <a
            onClick={(e) => {
              if (isEditMode) {
                e.preventDefault(); // prevent download
                return;
              }
              notify("info", "Downloading...");
            }}
            href={btnLink}
            download={`CoolPoster@${instagramHandle}.png`}
            className="mb-14 relative border-3 border-black rounded-lg
             w-full max-w-[256px] h-[29px]
             animate-customPulse overflow-hidden
             flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-white" />
            <span className="relative text-xs font-bold text-gray-900 flex items-center">
              <img
                className="inline-block w-4 h-4 mr-2"
                src="/svg/download.svg"
                alt="downloadSVG"
              />
              Download
            </span>
          </a>


        </div>

        {
          isEditMode && (
            <button
              className="fixed top-4 right-4 z-48 bg-black text-white px-4 py-2 rounded-lg"
              onClick={handleExitEditMode}
            >
              Save and exit
            </button>
          )
        }

        {
          showAddPopup && (
            <div className="fixed inset-0 z-49 flex items-center justify-center">

              <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddPopup(false)} />

              <div className="relative bg-white rounded-xl p-6 w-[calc(100vw-2rem)] max-w-sm">
                <p className="mb-4 text-sm font-semibold text-gray-500">
                  Input your new button name and link:
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const form = e.currentTarget
                    const buttonData: CustomButton = {
                      id: editingButton?.id || crypto.randomUUID(),
                      name: (form.elements.namedItem('name') as HTMLInputElement).value,
                      link: (form.elements.namedItem('link') as HTMLInputElement).value,
                      color: selectedColor,
                    }

                    setCustomButtons((prev) => {
                      if (editingButton) {
                        // Replace the existing button
                        return prev.map((b) => (b.id === editingButton.id ? buttonData : b))
                      } else {
                        // Add new button
                        return [...prev, buttonData]
                      }
                    })

                    setEditingButton(null)
                    setNameInput('')
                    setLinkInput('')
                    setSelectedColor('bg-blue-500')
                    setShowAddPopup(false)
                    form.reset()
                  }}
                  className="space-y-3"
                >

                  <input
                    name="name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Name"
                    required
                    className="w-full border p-2 text-gray-600"
                  />

                  <input
                    name="link"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Link"
                    required
                    className="w-full border p-2 text-gray-600"
                  />
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 w-max pr-2">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setSelectedColor(c.value)}
                          className={`w-8 h-8 rounded-full flex-shrink-0 ${c.value} ${selectedColor === c.value ? 'ring-2 ring-black' : ''
                            }`}
                        />
                      ))}
                    </div>
                  </div>



                  <button type="submit" className="w-full bg-black text-white py-2 rounded">
                    {editingButton ? 'Save Changes' : 'Add'}
                  </button>
                </form>
              </div>
            </div>
          )
        }

        {
          pendingDeleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" />

              <div className="relative bg-white rounded-xl p-6 w-full max-w-xs text-center">
                <p className="mb-4 font-semibold text-gray-500">Delete button?</p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setCustomButtons((prev) =>
                        prev.filter((b) => b.id !== pendingDeleteId)
                      )
                      setPendingDeleteId(null)
                    }}
                    className="px-4 py-2 bg-black text-white rounded"
                  >
                    Yes
                  </button>

                  <button
                    onClick={() => setPendingDeleteId(null)}
                    className="px-4 py-2 border rounded text-gray-600"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )
        }



        {
          showGuidePopup && (
            <div
              className="fixed inset-0 z-50"
              onClick={handleCloseGuidePopup}
            >
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/70" />

              {/* Text */}
              <div className="absolute top-0 left-0 right-0 flex justify-center px-6 pt-70 text-center">
                <div
                  className="bg-gray-700/50 backdrop-blur-sm border border-cyan-400 rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-base font-semibold mb-4">
                    <p className='text-lg'>Your first poster!</p>
                  </div>

                  <div className="mb-6">
                    <p className='text-gray-300'>This page is designed to help you share your poster with the owner of the car!<br></br><br></br></p>

                    <p><strong>To customise the below features:</strong> Tap and hold your poster. Try it now!</p><br />

                    <p>Features:</p>
                    <p className='text-xs'>
                      • Social buttons for visiting your profile<br></br>
                      • Custom message<br></br>
                      • Download and share options<br></br>
                    </p>

                  </div>

                  <label className="flex items-center gap-2 text-xs opacity-90 cursor-pointer text-gray-400">
                    <input
                      type="checkbox"
                      checked={dontShowAgainGuide}
                      onChange={(e) => setDontShowAgainGuide(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    <span>Don&apos;t show this again</span>
                  </label>
                </div>
              </div>
            </div>
          )
        }

        {
          showDeleteIgPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteIgPopup(false)} />

              {/* Popup box */}
              <div className="relative bg-white rounded-xl p-6 w-[calc(100vw-2rem)] max-w-sm">
                <p className="mb-4 text-sm font-semibold text-gray-500 text-center">
                  Are you sure you want to delete the Instagram button?
                </p>

                <div className="flex justify-between gap-4">
                  <button
                    className="flex-1 bg-gray-200 text-black py-2 rounded"
                    onClick={() => setShowDeleteIgPopup(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="flex-1 bg-red-500 text-white py-2 rounded"
                    onClick={async () => {
                      setRemoveIgButton(true)
                      setShowDeleteIgPopup(false)

                      if (!user) return
                      const userRef = doc(db, 'users', user.uid)
                      try {
                        await updateDoc(userRef, {
                          'settings.removeIgButton': true
                        })
                        console.log('Instagram button removed in user settings')
                      } catch (err) {
                        console.error('Failed to remove Instagram button:', err)
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        }


      </div >
    ))
  )
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
