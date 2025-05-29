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


// WHAT THIS FILE DOES:
// Validates auth
// Receives all poster input fields
// Renders the final poster image using renderPoster()
// Uploads to Storage: posters/{uid}/{uuid}.png
// Returns a signed URL for immediate access


// import {renderPoster} from "../scripts/photopeaRenderer";
// import {v4 as uuidv4} from "uuid";
// import {getStorage} from "firebase-admin/storage";

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

admin.initializeApp();

const corsHandler = cors({origin: true}); // Allow all origins — adjust for production

export const generatePoster = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    console.log("Function received a request:", req.method, req.url); // Testing

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

    try {
      const {psdUrl, userImageUrl, carDetails, description, instagramHandle} = req.body;

      console.log("generatePoster called");
      console.log("Car Details:", carDetails);

      // res.set("Access-Control-Allow-Origin", "*"); // ✅ set for every valid response

      // Simulated output
      return res.status(200).json({
        imageUrl: "https://example.com/mock.png",
      });
    } catch (err) {
      console.error("Rendering error:", err);
      // res.set("Access-Control-Allow-Origin", "*"); // ✅ even for errors
      return res.status(500).send("Failed to generate poster");
    }
  });
});


// const bucket = getStorage().bucket();

// export const generatePoster = functions.https.onCall(
//   async (data: any, context: functions.https.CallableContext) => { // Note: in order to use .CallableContect, we have to downgrade firebase-functions package to ^4.3.0 in order to use Firebase-functions v1 instead of v2 (see thier docs for more about this change).
//     if (!context?.auth) {
//       throw new functions.https.HttpsError("unauthenticated", "You must be logged in");
//     }

//     try {
//   const {
//     psdUrl,
//     userImageUrl,
//     carDetails,
//     description,
//     instagramHandle,
//   } = data;

//   const imageBuffer = await renderPoster({
//     psdUrl,
//     userImageUrl,
//     carDetails,
//     description,
//     instagramHandle,
//   });

//   const fileName = `posters/${context.auth.uid}/${uuidv4()}.png`;
//   const file = bucket.file(fileName);

//   await file.save(imageBuffer, {
//     metadata: {
//       contentType: "image/png",
//     },
//   });

//   const [url] = await file.getSignedUrl({
//     action: "read",
//     expires: "03-01-2030",
//   });

//   return {imageUrl: url};

// For testing:
//     console.log("generatePoster called by", context.auth?.uid);
//     console.log("data:", data);
//     return {imageUrl: "https://example.com/mock.png"};
//   } catch (err) {
//     console.error("Rendering error:", err);
//     throw new functions.https.HttpsError("internal", "Failed to generate poster");
//   }
// });
