/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Stripe from 'stripe'
import admin from 'firebase-admin'

// Disable body parsing for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY!)),
  })
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

// Map Stripe Price IDs to credit packs
const CREDIT_PACK_BY_PRICE: Record<string, { posterGen: number; ai: number; carJam: number }> = {
  'price_1StYmDJbxz2eE8bRSREJzbk5': { posterGen: 5, ai: 5, carJam: 5 },
  'price_1StYo7Jbxz2eE8bRs97E1WUh': { posterGen: 10, ai: 10, carJam: 10 },
  'price_1Sv8cUJbxz2eE8bRtnzEQgIU': { posterGen: 5, ai: 5, carJam: 5 },
  'price_1Sv8bQJbxz2eE8bRLKKLL1Zc': { posterGen: 10, ai: 10, carJam: 10 },
  'price_1Svq8MJbxz2eE8bRfIMM1AJ8': { posterGen: 5, ai: 5, carJam: 5 },
  'price_1Svq7SJbxz2eE8bRhjzZuEPQ': { posterGen: 10, ai: 10, carJam: 10 },
}

const SUPPORTER_PRICE_ID = 'price_1StYpiJbxz2eE8bR9xOyIYRm'

// stripe test product
// const SUPPORTER_PRICE_ID = 'price_1SunOvJbxz2eE8bRlXAq5TSD';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Missing Stripe signature', { status: 400 })

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      try {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      } catch (err) {
        console.error('Error in checkout.session.completed handler', err)
        return new Response('Internal server error', { status: 500 })
      }
      break

    case 'invoice.payment_succeeded':
      try {
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
      } catch (err) {
        console.error('Error in invoice.payment_succeeded handler', err)
        return new Response('Internal server error', { status: 500 })
      }
      break

    default:
      return new Response('Ignored', { status: 200 })
  }

  return new Response('OK', { status: 200 })
}

// ---------- Handlers ----------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log("Recieved Checkout Completed.");

try {
const email = session.customer_email ?? session.customer_details?.email
if (!email) {
    console.log('No customer email found on session.');
    return
}

const userRecord = await admin.auth().getUserByEmail(email)
  const uid = userRecord.uid

  // Fetch line items explicitly
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
  const line = lineItems.data[0]
  const priceId = line?.price?.id

//   console.log('Line items:', lineItems.data)
//   console.log('Price ID:', priceId)
  if (!priceId) return

  // CREDIT PACK PURCHASE
  if (session.mode === 'payment') {
    const credits = CREDIT_PACK_BY_PRICE[priceId]
    if (!credits) return

    await admin.firestore().collection('users').doc(uid).set(
      {
        credits: {
          posterGen: admin.firestore.FieldValue.increment(credits.posterGen),
          ai: admin.firestore.FieldValue.increment(credits.ai),
          carJam: admin.firestore.FieldValue.increment(credits.carJam),
        },
        hasPackUnlocks: true,
        unlocks: {
          showcaseCustomization: true,
          highQualityDownload: true,
        },
      },
      { merge: true }
    )
    
  }

  // SUPPORTER INITIAL ACTIVATION
  if (session.mode === 'subscription' && priceId === SUPPORTER_PRICE_ID) {
    await grantSupporterBenefits(uid)
  }

  } catch (err) {
    console.error('Error in handleCheckoutCompleted:', err)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.customer_email || !invoice.lines.data.length) return

  const line = invoice.lines.data[0]
  const priceId = (line as any).price?.id || (line as any).plan?.id
  if (priceId !== SUPPORTER_PRICE_ID) return

  const userRecord = await admin.auth().getUserByEmail(invoice.customer_email)
  const uid = userRecord.uid

  await grantSupporterBenefits(uid)
}

async function grantSupporterBenefits(uid: string) {
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  await admin.firestore().collection('users').doc(uid).set(
    {
      credits: {
        posterGen: admin.firestore.FieldValue.increment(10),
        ai: admin.firestore.FieldValue.increment(10),
        carJam: admin.firestore.FieldValue.increment(10),
      },
      hasPackUnlocks: true,
      unlocks: {
        showcaseCustomization: true,
        highQualityDownload: true,
        designerTemplates: true,
      },
      supporter: {
        isActive: true,
        expiresAt: threeMonthsFromNow,
      },
    },
    { merge: true }
  )

  // Update global supporter count
  const appRef = admin.firestore().collection('app').doc('supporterCount')
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(appRef)
    if (!snap.exists) {
      tx.set(appRef, { value: 1 })
    } else {
      tx.update(appRef, { value: admin.firestore.FieldValue.increment(1) })
    }
  })
}
