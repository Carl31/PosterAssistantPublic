/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import admin from 'firebase-admin'

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

const SUPPORTER_PRICE_ID = 'price_1StYpiJbxz2eE8bR9xOyIYRm';

// Stripe test mode:
// const SUPPORTER_PRICE_ID = 'price_1SunOvJbxz2eE8bRlXAq5TSD';

export async function POST(req: Request) {
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

  // Firestore user lookup
const userRef = admin.firestore().collection('users').doc(user.uid)
const userSnap = await userRef.get()

if (!userSnap.exists) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 })
}

const userData = userSnap.data()

// Reuse or create Stripe customer
let stripeCustomerId = userData?.stripeCustomerId
let customer: Stripe.Customer

if (stripeCustomerId) {
  customer = (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer
} else {
  if (!user.email) {
    return NextResponse.json({ error: 'User email missing' }, { status: 400 })
  }

  customer = await stripe.customers.create({
    email: user.email,
    metadata: { uid: user.uid },
  })

  stripeCustomerId = customer.id

  await userRef.update({
    stripeCustomerId,
  })
}


  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: SUPPORTER_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/store?supporter=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/store`,
  })

  return NextResponse.json({ url: session.url })
}
