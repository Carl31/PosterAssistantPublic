/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingPage from '@/components/LoadingPage';
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { signInWithEmailAndPassword } from 'firebase/auth'
import dynamic from 'next/dynamic';
import Notification from '@/components/Notification'
import { notify } from '@/utils/notify'
import { Anton } from 'next/font/google';
const anton = Anton({
  weight: '400',        // required because Anton isn't a variable font
  subsets: ['latin'],   // choose the subsets you need
  display: 'swap',      // optional, helps with font rendering strategy
});
const RecaptchaClient = dynamic(() => import('@/components/RecaptchaClient'), { ssr: false });


export default function Page() {
  const startY = useRef<number | null>(null);
  const startProgress = useRef(0);
  const [progress, setProgress] = useState(0);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [agreed, setAgreed] = useState(false); // track checkbox state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);



  const MIN_HEIGHT = 10;
  const MAX_HEIGHT = 35;
  const MAX_SWIPE_RATIO = 0.4;

  const MIN_SCALE = 0.94;
  const SCALE_MULTIPLIER = 2.59;

  const IMAGE_OFFSET_VH = -12.8;

  const MAX_IMAGE_SCALE = 1; // do not exceed natural frame size

  const GLOBAL_SCALE = 1.15; // 5% bigger than original

  const GLOBAL_VERTICAL_OFFSET_VH = -1; // positive = moves down, negative = moves up


  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!captchaToken) {
      notify('error', 'Please complete the reCAPTCHA.')
      return;
    }

    if (!agreed) {
      //alert("You must agree to the Privacy Policy and Terms & Conditions to sign up.");
      notify('error', 'You must agree to the Privacy Policy and Terms & Conditions to sign up.')
      return;
    }

    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      router.push('/account/dashboard?signup=true')
    } catch (err: any) {
      alert(err.message || 'Signup failed.')
      notify('error', 'Signup failed.')
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingPage text="Loading..." />
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    setLoading(true)
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/account/dashboard')
    } catch (err) {
      setLoading(false)
      alert('Login failed.' + err)
      notify('error', 'Login failed.')
    }
  }

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      router.push('/account/dashboard')
    } catch (err) {
      alert('Google sign-in failed.' + err)
      notify('error', 'Google sign-in failed.')
    }
  }


  // frame inset: vertical + horizontal
  const FRAME_INSET_VH = 2.2;
  const FRAME_INSET_VW = 11.5; // THIS fixes left/right visibility


  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function handleTouchStart(y: number) {
    startY.current = y;
  }

  function handleTouchEnd(y: number) {
    if (startY.current === null) return;

    const delta = startY.current - y; // positive = swipe up, negative = swipe down
    if (delta > 10) animateTo(1);      // swipe up
    else if (delta < -10) animateTo(0); // swipe down

    startY.current = null;
  }

  function animateTo(target: number) {
    const duration = 290;
    const start = progress;
    const startTime = performance.now();

    function step(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const next = start + (target - start) * t;
      setProgress(next);
      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }



  function start(y: number) {
    startY.current = y;
    startProgress.current = progress;
  }

  function move(y: number) {
    if (startY.current === null) return;

    const maxSwipe = window.innerHeight * MAX_SWIPE_RATIO;
    const delta = startY.current - y;
    const next = startProgress.current + delta / maxSwipe;

    setProgress(clamp(next, 0, 1));
  }

  function end() {
    startY.current = null;
  }

  const sheetHeight =
    MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * progress;

  const imageScale =
    1 - (1 - MIN_SCALE) * progress * SCALE_MULTIPLIER;

  return (
    <section className="fixed inset-0 overflow-hidden">
      <Notification />

      <div
        onTouchStart={e => handleTouchStart(e.touches[0].clientY)}
        onTouchEnd={e => handleTouchEnd(e.changedTouches[0].clientY)}
        onMouseDown={e => handleTouchStart(e.clientY)}
        onMouseUp={e => handleTouchEnd(e.clientY)}

        className="relative h-screen w-screen overflow-hidden touch-auto bg-white"
      >
        {/* Scaled object */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{
            marginTop:
              progress === 0
                ? `${IMAGE_OFFSET_VH + GLOBAL_VERTICAL_OFFSET_VH - 8}vh`
                : `${IMAGE_OFFSET_VH + (1 - imageScale) * 6 + GLOBAL_VERTICAL_OFFSET_VH - 8}vh`,

          }}>
          <div
            className="absolute inset-0 origin-top flex justify-center"
            style={{
              transform: `scale(${GLOBAL_SCALE * Math.min(imageScale, MAX_IMAGE_SCALE)})`,
              marginTop:
                progress === 0
                  ? `${IMAGE_OFFSET_VH + GLOBAL_VERTICAL_OFFSET_VH}vh`
                  : `${IMAGE_OFFSET_VH + (1 - imageScale) * 6 + GLOBAL_VERTICAL_OFFSET_VH}vh`,
            }}
          >
            {/* FRAME container */}
            <div className="relative w-full h-full" id="sheet">
              {/* Frame */}
              <img
                src="/png/frame.png"
                className="absolute inset-0 h-full w-full object-contain"
                alt=""
                style={{ opacity: progress }}
              />

              {/* IMAGE container (actually narrower than frame) */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[49.8%]
"
                style={{
                  width: `calc(100% - ${FRAME_INSET_VW * 2}vw)`,
                  height: `calc(100% - ${FRAME_INSET_VH * 2}vh)`,
                }}
              >


                {/* Base image */}
                <img
                  src="https://res.cloudinary.com/dauhchstc/image/upload/v1766388928/fullimg_pi4f76.png"
                  className="absolute inset-0 h-full w-full object-contain"
                  alt=""
                />

                {/* Overlay image */}
                <img
                  src="https://res.cloudinary.com/dauhchstc/image/upload/v1768166789/fullimg2_wom5al.png"
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ opacity: progress }}
                  alt=""
                />
              </div>
            </div>
          </div>

          {/* Text */}
          <div
            className="
    absolute left-1/2 top-1/2
    -translate-x-1/2 -translate-y-[310%]
    px-5 py-3
    rounded-2xl
    bg-black/80 backdrop-blur
    text-white text-center
    tracking-wide
    pointer-events-none
    whitespace-nowrap
    shadow-lg
    max-w-[90vw]
    border-2 border-white
  "
            style={{ opacity: clamp(1 - progress, 0, 1) }}
          >
            <p className="text-sm sm:text-base font-medium mr-1">
              Photos are just the start...
            </p>

            <div className="mt-2 text-[10px] sm:text-xs opacity-80">
              SWIPE UP
            </div>
          </div>



          {/* <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[1200%] tracking-widest text-black pointer-events-none"
          style={{ opacity: clamp(progress * 1.2, 0, 1) }}
        >
          INTO THIS
        </div> */}

          {/* Bottom sheet */}
          <div
            className="absolute bottom-0 left-0 w-full bg-white/70 rounded-t-3xl flex flex-col items-center pt-10 backdrop-blur-sm"

            style={{ height: `${sheetHeight}%` }}
          >
            
                <h1
                  className={`text-4xl sm:text-5xl md:text-5xl lg:text-6xl mb-4 text-blue-400 text-center ${anton.className}`}
                  style={{
                opacity: progress > 0.6 ? (progress - 0.6) / 0.4 : 0,
              }}
                >
                  SICKSHOTS <span className="text-[0.75em] ml-[-0.15em]">AI</span>
                </h1>

            <div
              className="flex flex-col gap-4"
              style={{
                opacity: progress > 0.6 ? (progress - 0.6) / 0.4 : 0,
              }}
            >
              <button
                className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm min-w-40"
                onClick={() => setShowSignupForm(true)}
              >
                Sign Up
              </button>

              <button
                className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm min-w-40"
                onClick={() => setShowLoginForm(true)}
              >
                Log In
              </button>
            </div>
          </div>


        </div>




      </div>

      {/* Signup overlay */}
      <div
        className={`fixed inset-0 bg-white z-49 transform transition-transform duration-500 ease-in-out overflow-auto p-8 ${showSignupForm ? 'translate-y-0' : 'translate-y-full'
          }`}
      >
        <form onSubmit={handleSignup} className="max-w-sm mx-auto flex flex-col gap-3">
          <h1 className="text-2xl font-bold mb-4 text-black">Sign Up</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded border-black text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded border-black text-black"
          />

          <div className="mb-4 w-full">
            <label className="text-xs text-gray-600 flex items-center gap-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="flex-shrink-0"
              />
              <span className="flex flex-wrap gap-1">
                I agree to the
                <a href="/privacy-policy" className="underline">Privacy Policy</a> and
                <a href="/terms-and-conditions" className="underline">Terms & Conditions</a>
              </span>
            </label>
          </div>

          {typeof window !== 'undefined' && <RecaptchaClient onChange={setCaptchaToken} />}

          <button type="submit" className="w-full px-3 py-2 mt-3 rounded-lg bg-black text-white hover:bg-gray-700 transition-colors text-sm">
            Sign Up
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => setShowSignupForm(false)}
            className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm"
          >
            Back
          </button>
        </form>
      </div>

      {/* Login overlay */}
      <div
        className={`fixed inset-0 bg-white z-49 transform transition-transform duration-500 ease-in-out overflow-auto p-8 ${showLoginForm ? 'translate-y-0' : 'translate-y-full'
          }`}
      >
        <form onSubmit={handleLogin} className="max-w-sm mx-auto flex flex-col gap-3">
          <h1 className="text-2xl font-bold mb-4 text-black">Login</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded border-black text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded border-black text-black"
          />

          <button type="submit" className="w-full px-3 py-2 mt-3 rounded-lg bg-black text-white hover:bg-gray-700 transition-colors text-sm">
            Login
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => setShowLoginForm(false)}
            className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm"
          >
            Back
          </button>
        </form>
      </div>
    </section>
  );
}