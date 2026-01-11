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
const RecaptchaClient = dynamic(() => import('@/components/RecaptchaClient'), { ssr: false });


export default function Page() {
  const startY = useRef<number | null>(null);
  const startProgress = useRef(0);
  const [progress, setProgress] = useState(0);
  const [showSignupLoading, setShowSignupLoading] = useState(false)
  const [showLoginLoading, setShowLoginLoading] = useState(false)
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

  const handleSignUp = () => {
    router.push('/signup')
  }

  const handleLogIn = () => {
    router.push('/login')
  }

  function scrollToForm(id: string) {
    //setShowLoading(true);
    const el = document.getElementById(id);
    //console.log(el);
    //const el = document.getElementById("login-form");

    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });

      if (el.id === "signup-form") {
        setShowSignupLoading(true)
      }

      if (el.id === "login-form") {
        setShowLoginLoading(true)
      }
    }



  }

  const scrollToTop = () => {
    console.log("Scrolling to top");
    // window.scrollTo({
    //   top: 0,
    //   left: 0,
    //   behavior: 'smooth',
    // })


    const el = document.getElementById("sheet");
    //console.log(el);
    //const el = document.getElementById("login-form");

    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }

  }


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
            <img
              src="/png/sickshotsai.png"
              alt="logo"
              className="h-9 w-35 mb-6 mr-1"
              style={{
                opacity: progress > 0.6 ? (progress - 0.6) / 0.4 : 0,
              }}
            />

            <div
              className="flex flex-col gap-4"
              style={{
                opacity: progress > 0.6 ? (progress - 0.6) / 0.4 : 0,
              }}
            >
              <button
                className="px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm min-w-40"
                onClick={() => scrollToForm('signup-form')}
              >
                Sign Up
              </button>

              <button
                className="px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm min-w-40"
                onClick={() => scrollToForm('login-form')}
              >
                Log In
              </button>
            </div>
          </div>


        </div>




      </div>

      <div id="signup-form" className="h-screen w-full bg-gray-100 flex flex-col items-center justify-center">
        {showSignupLoading ? <form onSubmit={handleSignup} className="p-8 max-w-sm mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-black">Sign Up</h1>

          <div className="flex flex-col w-full overflow-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border p-2 mb-2 rounded border-black text-black"
              disabled={loading}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border p-2 mb-4 rounded border-black text-black"
              disabled={loading}
            />
          </div>


          <div className="mb-4 w-full">
            <label className="text-xs text-gray-600 flex flex-wrap items-center gap-1 sm:gap-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mr-1 flex-shrink-0"
              />
              <span className="flex flex-wrap gap-1">
                I agree to the
                <a href="/privacy-policy" className="underline">Privacy Policy</a> and
                <a href="/terms-and-conditions" className="underline">Terms & Conditions</a>.
              </span>
            </label>
          </div>


          {typeof window !== 'undefined' && <RecaptchaClient onChange={setCaptchaToken} />}



          <button
            type="submit"
            disabled={loading}
            className="w-full px-3 mt-3 py-2 rounded-lg bg-black text-white hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Signing up…' : 'Sign Up'}
          </button>
          {/* Google login/signup */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            Continue with Google
          </button>
          <button
            onClick={scrollToTop}
            type="button"
            className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            Back
          </button>
        </form> : null}


      </div>

      <div id="login-form" className="h-screen w-full bg-gray-200 flex items-center justify-center">
        {showLoginLoading ? <div>
          {/* Email/password inputs */}
          <form onSubmit={handleLogin} className="p-8 max-w-sm mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-black">Login</h1>
            <div className="flex flex-col w-full overflow-auto">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                className="w-full border border-black text-black p-2 mb-2 rounded" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                className="w-full border border-black text-black p-2 mb-4 rounded" />
            </div>

            <button type="submit" className="w-full px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-700 transition-colors text-sm disabled:opacity-50">Login</button>

            {/* Google login/signup */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
            >
              Continue with Google
            </button>
            <button
              onClick={scrollToTop}
              type="button"
              className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-black text-black hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
            >
              Back
            </button>
          </form>


        </div> : null}
      </div>
    </section>

  );
}