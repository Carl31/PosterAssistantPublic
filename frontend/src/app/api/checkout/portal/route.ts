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


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-12-15.clover' })

export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify Firebase token
  const decoded = await admin.auth().verifyIdToken(token)
  const uid = decoded.uid

  // Get Firestore user to retrieve Stripe customer ID
  const snap = await admin.firestore().collection('users').doc(uid).get()
  const user = snap.data()
  if (!user?.stripeCustomerId) return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })

  // Create portal session
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/store`,
  })

  return NextResponse.json({ url: portalSession.url })
}
