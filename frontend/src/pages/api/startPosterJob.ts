// pages/api/startPosterJob.ts

'use client'
import type { NextApiRequest, NextApiResponse } from 'next'

import { db } from '@/firebase/client'
import { doc, setDoc } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }
    console.log("Recieved request:", req.method, req.url);

    const { userId, token, jobId, psdUrl, userImageUrl, carDetails, description, instagramHandle, fontsUsed, templateId, supportedTexts } = req.body

    try {
        // Old way
        // const response = await fetch('https://us-central1-posterassistant-aebf0.cloudfunctions.net/generatePoster', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         Authorization: `Bearer ${token}`
        //     },
        //     body: JSON.stringify({
        //         jobId,
        //         psdUrl,
        //         userImageUrl,
        //         carDetails,
        //         description,
        //         instagramHandle,
        //         fontsUsed
        //     })
        // })

       await setDoc(doc(db, 'jobs', jobId), {
        userId,
        status: 'queued',
        progress: 'Job created',
        psdUrl,
        userImageUrl,
        carDetails,
        description,
        instagramHandle,
        fontsUsed,
        token,
        createdAt: serverTimestamp(),
        templateId,
        supportedTexts
        });

        console.log('Job started:', jobId);
        return res.status(200).json({ status: 'Job started', jobId });

        // Old way
        // if (!response.ok) {
        //     throw new Error(`Cloud function error: ${await response.text()}`)
        // }

        // return res.status(200).json({ status: 'started' })
    } catch (err) {
        console.error('Error starting job:', err)
        return res.status(500).json({ error: 'Failed to start job. ' + err })
    }
}