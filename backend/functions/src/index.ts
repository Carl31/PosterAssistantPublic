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


// This file also exports other firebase functions (see last line of file)


import {renderPoster} from "../scripts/photopeaRenderer";
import {v4 as uuidv4} from "uuid";
import {getStorage} from "firebase-admin/storage";


import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

import sharp from 'sharp'; // For image compression
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

admin.initializeApp();

// const corsHandler = cors({origin: true}); // Allow all origins — adjust for production


// Now, every time an image is uploaded to your Storage bucket, this function will:
// Check if it’s an image.
// Skip if it’s already a thumbnail.
// Create a 300px wide JPEG (around ~300 KB).
// Save it in the same folder with _thumb appended to the filename.

// The generatePosterThumbnail is exactly the same but for posters instead of user image uploads

// Example:
// user_uploads/uid/photo.jpg
// user_uploads/uid/photo_thumb.jpg

export const generateThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    const bucket = admin.storage().bucket(object.bucket);
    const filePath = object.name; // e.g. 'user_uploads/uid/photo.jpg'
    const contentType = object.contentType;

    // Exit if the file is not an image
    if (!contentType?.startsWith('image/')) {
      console.log('Not an image, skipping:', filePath);
      return null;
    }

    // Avoid infinite loops (don’t thumbnail an already-generated thumbnail)
    if (filePath?.includes('_thumb')) {
      console.log('Already a thumbnail, skipping:', filePath);
      return null;
    }

    const fileName = path.basename(filePath!);
    const thumbFileName = fileName.replace(/(\.[\w\d_-]+)$/i, '_thumb$1');
    const thumbFilePath = path.join(path.dirname(filePath!), thumbFileName);

    // Download file to tmp
    const tempFilePath = path.join(os.tmpdir(), fileName);
    await bucket.file(filePath!).download({destination: tempFilePath});

    // Generate thumbnail (~300 KB target, width ~300px)
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
    await sharp(tempFilePath)
      .resize(300) // width 300px, auto height
      .jpeg({quality: 80}) // adjust quality for ~300KB average
      .toFile(tempThumbPath);

    // Upload thumbnail back to the same folder
    await bucket.upload(tempThumbPath, {
      destination: thumbFilePath,
      metadata: {contentType: 'image/jpeg'},
    });

    // Cleanup tmp files
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(tempThumbPath);

    console.log('Thumbnail created at', thumbFilePath);
    return null;
  });

const bucket = admin.storage().bucket();

export const generatePosterThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    if (!object.name) return;
    if (!object.contentType?.startsWith("image/")) return;
    if (object.name.includes("_thumb")) return; // avoid loops

    // Only process poster images
    if (!object.name.startsWith("user_posters/")) return;

    const filePath = object.name;
    const fileName = filePath.split("/").pop();
    const fileDir = filePath.split("/").slice(0, -1).join("/");
    const thumbFileName = fileName?.replace(".png", "_thumb.png");
    const thumbFilePath = `${fileDir}/${thumbFileName}`;

    // Download original
    const [buffer] = await bucket.file(filePath).download();

    // Resize + compress
    const thumbnailBuffer = await sharp(buffer)
      .resize(400) // width in px
      .png({quality: 80})
      .toBuffer();

    // Upload thumbnail
    await bucket.file(thumbFilePath).save(thumbnailBuffer, {
      metadata: {contentType: "image/png"},
    });

    // Generate the signed URL for the thumbnail
    const [thumbUrl] = await bucket.file(thumbFilePath).getSignedUrl({
      action: "read",
      expires: "03-01-3030",
    });

    const pathParts = filePath.split('/'); // ["user_posters", "abc123", "def456.png"]
    if (pathParts.length !== 3 || pathParts[0] !== 'user_posters') {
      console.log("File is not in the expected user_posters folder, exiting...");
      return;
    }

    const uid = pathParts[1]; // "abc123"
    const posterFileName = pathParts[2]; // "def456.png"
    const posterId = posterFileName.replace('.png', ''); // "def456"

    // Update Firestore document for that poster (example for posters)
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .collection("posters")
      .doc(posterId)
      .set({thumbnailUrl: thumbUrl}, {merge: true});

    console.log(`Thumbnail created at ${thumbFilePath}`);
  });


// How to export other functions:
export {detectCarDetailsWithGemini} from '../scripts/carAnalyzer';
export {generateCarDescriptionWithGemini} from '../scripts/carDescriptor';
export {generatePosterOnJobCreate} from "../scripts/generatePoster";
