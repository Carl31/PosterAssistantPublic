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

admin.initializeApp();

const corsHandler = cors({origin: true}); // Allow all origins — adjust for production

const bucket = getStorage().bucket();
const db = admin.firestore();

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

        const {psdUrl, userImageUrl, carDetails, description, instagramHandle} = req.body;

        // Step 1: Generate the original poster
        console.log("Generating poster...");
        // Render the poster
        const imageBuffer = await renderPoster({
          psdUrl,
          userImageUrl,
          carDetails,
          description,
          instagramHandle,
        });

        // Step 2: Upload to 'posters/...'
        // Upload the image to Firebase Storage
        console.log("Uploading poster...");
        const fileName = `user_posters/${uid}/${uuidv4()}.png`;
        const file = bucket.file(fileName);

        await file.save(imageBuffer, {
          metadata: {
            contentType: "image/png",
          },
        });

        const [posterUrl] = await file.getSignedUrl({
          action: "read",
          expires: "03-01-2030",
        });

        // // Step 3: Generate the mockup from the poster URL
        // console.log("Generating mockup...");
        // const mockupBuffer = await renderMockup(posterUrl); // if wanting to change mockup type, add it as an argument here
        // // Step 4: Upload to 'mockups/...'
        // console.log("Uploading mockup...");
        // const mockupFile = bucket.file(`mockups/${uid}/${uuidv4()}.png`);
        // await mockupFile.save(mockupBuffer, {metadata: {contentType: 'image/png'}});
        // const [mockupUrl] = await mockupFile.getSignedUrl({action: 'read', expires: '03-01-2030'});

        // Return the signed URL as a JSON response
        // Step 5: Return both
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

// Frontend calls this to download a poster file: (not required anyymore since I allow any origin to download frrom storage bucket)
// export const downloadPoster = functions .runWith({memory: "2GB", timeoutSeconds: 30})
//   .https.onRequest(async (req, res) => {
//     console.log("Function received a request:", req.method, req.url); // Testing

//     corsHandler(req, res, async () => {
//       try {
//         // Auth
//         const authHeader = req.headers.authorization || "";
//         const match = authHeader.match(/^Bearer (.+)$/);
//         const idToken = match?.[1];

//         if (!idToken) {
//           return res.status(401).send("Unauthorized: No token provided");
//         }

//         const decodedToken = await admin.auth().verifyIdToken(idToken);
//         const uid = decodedToken.uid;
//         console.log("User ID:", uid);
//         // End auth


//         const posterId = req.query.posterId as string;

//         if (!posterId) {
//           console.log("Missing posterId");
//           return res.status(400).send("Missing posterId");
//         }

//         console.log("Using UID:", uid); // Make sure uid has a value and is correct
//         console.log("Using posterId:", posterId); // Make sure posterId has a value and is correct

//         const posterRef = db.doc(`users/${uid}/posters/${posterId}`);
//         console.log("Poster ref:", posterRef);
//         const posterSnap = await posterRef.get();

//         if (!posterSnap.exists) {
//           console.log("Poster not found");
//           return res.status(404).send("Poster not found");
//         }

//        const posterData = posterSnap.data();
//     const imageUrl = posterData?.imageUrl;

//     if (!imageUrl) {
//       console.log("No imageUrl found in poster document");
//       return res.status(404).send("Poster image URL not found");
//     }

//     // Fetch the image from the signed URL
//     const response = await fetch(imageUrl);

//     if (!response.ok) {
//       console.error("Failed to fetch image from signed URL", response.statusText);
//       return res.status(500).send("Failed to retrieve image from storage");
//     }

//     // Set headers for file download
//     res.setHeader("Content-Type", "image/png");
//     res.setHeader("Content-Disposition", "attachment; filename=poster.png");

//     // This line sends the successful response (streams the file)
//     return res.redirect(imageUrl);
//       } catch (err) {
//         console.error("Error in downloadPoster:", err);
//         return res.status(500).send("Internal server error");
//       }
//     });
//   });

// How to export other functions:
export {detectCarDetailsWithGemini} from '../scripts/carAnalyzer';
export {generateCarDescriptionWithGemini} from '../scripts/carDescriptor';
