// pages/api/startPosterJob.ts

'use client'
import type { NextApiRequest, NextApiResponse } from 'next'

import { db } from '@/firebase/client'
import { doc, setDoc } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import type { StartPosterJobBody } from '@/types/posterJob'


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }
    console.log("Recieved request:", req.method, req.url);

    const body = req.body as StartPosterJobBody
    const {
        userId,
        token,
        jobId,
        psdUrl,
        userImageUrl,
        carDetails,
        description,
        instagramHandle,
        fontsUsed,
        templateId,
        supportedTexts,
        hexColour,
        hexElements,
        accentHexValue,
        accentHexElements,
        psdFileReverseUrl,
        alignDefault,
        alignChosen,
    } = body

    try {
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
        supportedTexts,
        hexColour: hexColour ?? '',
        hexElements: hexElements ?? [],
        accentHexValue: accentHexValue ?? null,
        accentHexElements: accentHexElements ?? [],
        psdFileReverseUrl: psdFileReverseUrl ?? null,
        alignDefault: alignDefault ?? null,
        alignChosen: alignChosen ?? null,
        });

        console.log('Job started:', jobId);
        return res.status(200).json({ status: 'Job started', jobId });

    } catch (err) {
        console.error('Error starting job:', err)
        return res.status(500).json({ error: 'Failed to start job. ' + err })
    }
}
