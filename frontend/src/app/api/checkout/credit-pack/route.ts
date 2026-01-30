import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import admin from 'firebase-admin'

console.log('ADMIN KEY EXISTS:', !!process.env.FIREBASE_ADMIN_KEY)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_ADMIN_KEY!)
    ),
  })
}


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

// Map pack names to Stripe Price IDs
const PRICE_IDS = {
  small: 'price_1StYmDJbxz2eE8bRSREJzbk5',
  large: 'price_1StYo7Jbxz2eE8bRs97E1WUh',
}

const SUPPORTER_PRICE_IDS = {
  small: 'price_1Sv8cUJbxz2eE8bRtnzEQgIU',
  large: 'price_1Sv8bQJbxz2eE8bRLKKLL1Zc',
} as const

// Stripe test mode IDs:
// const PRICE_IDS = {
//   small: 'price_1SunNhJbxz2eE8bRYbgVvEas',
//   large: 'price_1SunODJbxz2eE8bRtLHRkohC',
// } as const

// const SUPPORTER_PRICE_IDS = {
//   small: 'price_1Sv8VmJbxz2eE8bRT4SfVbsL',
//   large: 'price_1Sv8UwJbxz2eE8bRMedNVjEh',
// } as const

export async function POST(req: Request) {
  try {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const idToken = authHeader.replace('Bearer ', '')

  let user
  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    user = { uid: decoded.uid, email: decoded.email }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

    const body: { pack: 'small' | 'large', isSupporter: boolean } = await req.json()
    const priceId = body.isSupporter
  ? SUPPORTER_PRICE_IDS[body.pack]
  : PRICE_IDS[body.pack]
    if (!priceId) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })


  // Create or reuse Stripe customer
  // Firestore user lookup
const userRef = admin.firestore().collection('users').doc(user.uid)
const userSnap = await userRef.get()

if (!userSnap.exists) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 })
}

const userData = userSnap.data()

// Reuse or create Stripe customer
let stripeCustomerId = userData?.stripeCustomerId

if (!stripeCustomerId) {
  if (!user.email) {
    return NextResponse.json({ error: 'User email missing' }, { status: 400 })
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { uid: user.uid },
  })

  stripeCustomerId = customer.id

  await userRef.update({
    stripeCustomerId,
  })
}

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/store?credits=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/store`,
  })

  return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
