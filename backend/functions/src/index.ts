/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import { onRequest } from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Above code is default code.


// WHAT generatePoster FUNCTION DOES:
// Validates auth
// Receives all poster input fields
// Renders the final poster image using renderPoster()
// Uploads to Storage: posters/{uid}/{uuid}.png
// Returns a signed URL for immediate access

// This file also exports other firebase functions (see last line of file)


import {renderPoster} from "../scripts/photopeaRenderer";
import {v4 as uuidv4} from "uuid";
import {getStorage} from "firebase-admin/storage";


import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

import sharp from 'sharp'; // For image compression

admin.initializeApp();

const corsHandler = cors({origin: true}); // Allow all origins — adjust for production

const bucket = getStorage().bucket();
const db = admin.firestore();

async function updateJobStatus(jobId: string, status: { progress: string; status: 'in-progress' | 'complete' | 'error' }) {
  await db.collection('jobs').doc(jobId).set(status, {merge: true});
}

export const generatePoster = functions .runWith({memory: "8GB", timeoutSeconds: 120})
  .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
      console.log("Function received a request:", req.method, req.url); // Testing

      // Don't have to manually set headers when using cors package.
      // ✅ Handle CORS Preflight (OPTIONS)
      // if (req.method === "OPTIONS") {
      //   res.set("Access-Control-Allow-Origin", "*");
      //   res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      //   res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      //   res.status(204).send(""); // No content
      //   return;
      // }

      // // ✅ Set CORS headers on actual response
      // res.set("Access-Control-Allow-Origin", "*");

      // if (req.method !== "POST") {
      //   res.set("Access-Control-Allow-Origin", "*"); // ✅ always explicitly include this
      //   return res.status(405).send("Method Not Allowed");
      // }

      if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
      }

      // Handle authenticated POST from frontend with poster generation data
      try {
        // Auth
        const authHeader = req.headers.authorization || "";
        const match = authHeader.match(/^Bearer (.+)$/);
        const idToken = match?.[1];

        if (!idToken) {
          return res.status(401).send("Unauthorized: No token provided");
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        console.log("User ID:", uid);
        // End auth

        const {psdUrl, userImageUrl, carDetails, description, instagramHandle, fontsUsed = [], jobId} = req.body;

        // Step 1: Generate the original poster
        console.log("Generating poster...");
        await updateJobStatus(jobId, {progress: "Preparing canvas", status: 'in-progress'});
        // Render the poster
        const imageBuffer = await renderPoster({
          psdUrl,
          userImageUrl,
          carDetails,
          description,
          instagramHandle,
          fontsUsed,
          onProgress: (status) => updateJobStatus(jobId, status),
        });

        await updateJobStatus(jobId, {progress: "Compressing image", status: 'in-progress'});

        // Step 1.5: Compress image
        // TODO: FOR FUTURE - If user is on paid version, do not compress!!
        console.log("Compressing image...");
        const compressedBuffer = await sharp(imageBuffer)
          .jpeg({quality: 75}) // Adjust this as needed
          .toBuffer();

        // Step 2: Upload to 'posters/...'
        // Upload the image to Firebase Storage
        await updateJobStatus(jobId, {progress: "Uploading poster", status: 'in-progress'});
        console.log("Uploading poster...");
        const fileName = `user_posters/${uid}/${uuidv4()}.png`;
        const file = bucket.file(fileName);

        await file.save(compressedBuffer, {
          metadata: {
            contentType: "image/png",
          },
        });

        const [posterUrl] = await file.getSignedUrl({
          action: "read",
          expires: "03-01-3030",
        });

        // Not generating mockup with Photopea as takes too long:
        // // Step 3: Generate the mockup from the poster URL
        // console.log("Generating mockup...");
        // const mockupBuffer = await renderMockup(posterUrl); // if wanting to change mockup type, add it as an argument here
        // // Step 4: Upload to 'mockups/...'
        // console.log("Uploading mockup...");
        // const mockupFile = bucket.file(`mockups/${uid}/${uuidv4()}.png`);
        // await mockupFile.save(mockupBuffer, {metadata: {contentType: 'image/png'}});
        // const [mockupUrl] = await mockupFile.getSignedUrl({action: 'read', expires: '03-01-3030'});

        // Return the signed URL as a JSON response
        // Step 5: Return both
        await updateJobStatus(jobId, {progress: "Complete", status: 'complete'});
        console.log("Returning response...");
        return res.status(200).json({
          imageUrl: posterUrl,
          mockupUrl: "mockupUrl",
        });

        // Testing
        // console.log("generatePoster called");
        // console.log("Car Details:", carDetails);

      // Simulated output
      // return res.status(200).json({
      //   imageUrl: "https://example.com/mock.png",
      // });
      } catch (err) {
        console.error("Rendering error:", err);
        return res.status(500).send("Failed to generate poster/mockup.");
      }
    });
  });


// How to export other functions:
export {detectCarDetailsWithGemini} from '../scripts/carAnalyzer';
export {generateCarDescriptionWithGemini} from '../scripts/carDescriptor';
