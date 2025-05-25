'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/firebase/client'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext<{ user: User | null }>({ user: null })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)

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
                            favouriteTemplates: []
                        }
                    })
                }
            }
        })

        return () => unsubscribe()
    }, [])

    return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
