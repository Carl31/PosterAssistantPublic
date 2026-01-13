'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/firebase/client'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext<{ user: User | null, isAuthChecked: boolean }>({
  user: null,
  isAuthChecked: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isAuthChecked, setIsAuthChecked] = useState(false)
    

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            setIsAuthChecked(true)

            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid)
                const docSnap = await getDoc(userRef)

                if (!docSnap.exists()) {
                    await setDoc(userRef, {
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || '',
                        instagramHandle: '',
                        createdAt: serverTimestamp(),
                        subscription: {
                            status: 'active',
                            tier: 'free',
                            nextBillingDate: null,
                            stripeCustomerId: null,
                            subscriptionId: null,
                        },
                        settings: {
                            favouriteTemplates: [],
                            displayMessage: 'If you like my poster, follow me on Instagram!',
                            toggleUseAI: true, // currently no use case for this
                        },
                        credits : {
                            ai: 7,
                            posterGen: 7,
                            carJam: 7,
                        }
                    })
                }
            }
        })

        return () => unsubscribe()
    }, [])

    return <AuthContext.Provider value={{ user, isAuthChecked }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
