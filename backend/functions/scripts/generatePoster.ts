import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {renderPoster} from "./photopeaRenderer";
import {v4 as uuidv4} from "uuid";
import sharp from 'sharp'; // For image compression

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Firestore-triggered function
export const generatePosterOnJobCreate = functions
  .runWith({
    // These are your custom runtime options!
    memory: "8GB", // Allocate 8GB of memory (this corresponds to 4.8 GHz of CPU!)
    timeoutSeconds: 120, // Allow the function to run for up to 120 seconds (2 minutes)
  })
  .firestore
  .document("jobs/{jobId}")
  .onCreate(async (snap, context) => {
    const jobId = context.params.jobId;
    const data = snap.data();
    let posterData = null;

    try {
      console.log("🎬 New job detected:", jobId);

      posterData = data;

      const {
        psdUrl,
        userImageUrl,
        carDetails,
        description,
        instagramHandle,
        fontsUsed = [],
        token,
        templateId,
      } = data;

      // ✅ 1. Verify token and extract UID
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;
      console.log("✅ Verified UID:", uid);

      await updateJobStatus(jobId, {
        progress: "Preparing canvas",
        status: "in-progress",
      });

      // ✅ 2. Generate poster
      const imageBuffer = await renderPoster({
        psdUrl,
        userImageUrl,
        carDetails,
        description,
        instagramHandle,
        fontsUsed,
        onProgress: (progress) =>
          updateJobStatus(jobId, {progress, status: "in-progress"}),
      });

      await updateJobStatus(jobId, {
        progress: "Compressing image",
        status: "in-progress",
      });

      const compressedBuffer = await sharp(imageBuffer)
        .jpeg({quality: 75})
        .toBuffer();

      await updateJobStatus(jobId, {progress: "Uploading poster", status: "in-progress"});

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

      await updateJobStatus(jobId, {
        progress: "Complete",
        status: "complete",
        posterUrl,
      });

      // Post metadate to users posters
      await savePosterMetadata(uid, jobId, posterUrl, userImageUrl, templateId, description, carDetails, instagramHandle);

      console.log("✅ Poster job completed:", jobId);
    } catch (error) {
      console.error("❌ Poster job failed:", jobId, error);
      await updateJobStatus(jobId, {
        progress: "Error",
        status: "error",
        error: (error as Error).message,
      });
    }
  });

// Helper to update job doc
async function updateJobStatus(
  jobId: string,
  update: Record<string, any>
) {
  await db.collection("jobs").doc(jobId).set(update, {merge: true});
}

const savePosterMetadata = async (uid: string, jobId: string, posterUrl: string, userImageUrl: string, templateId: string, description: string, carDetails: string, instagramHandle: string) => { // TODO: need to use this somewhere!
  console.log("Saving poster metadata...");
  await db.collection('users').doc(uid).collection('posters').doc(jobId).set({
    posterUrl,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    inputImageUrl: userImageUrl,
    templateId,
    description,
    carDetails,
    instagramHandle,
  });
};


