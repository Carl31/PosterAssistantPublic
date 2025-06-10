// Import necessary modules for Firebase Functions and Google Generative AI
import * as functions from "firebase-functions";
// Use defineSecret from firebase-functions/v2/params for V2 functions
// This links the secret you set via the CLI to your function
import * as admin from "firebase-admin";
import cors from "cors";
import {GoogleGenerativeAI, HarmCategory, HarmBlockThreshold} from "@google/generative-ai";
const corsHandler = cors({origin: true}); // Allow all origins — adjust for production

// Model name constant
const GEMINI_FLASH_MODEL_NAME = "gemini-2.0-flash";

// Initialize the safety settings (can be defined globally or inside the function)
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Define the generation configuration
const generationConfig = {
  temperature: 0.9,
  topK: 32,
  topP: 0.95,
  maxOutputTokens: 1024,
};


/**
 * Cloud Function to detect car details from an image using the Gemini API.
 *
 * This is an HTTPS Callable function, invoked directly from your web client.
 * It expects image data (base64 string) and mime type in the request data.
 *
 * @param data - The request data, expected to be { base64Image: string, mimeType: string }.
 * @returns A Promise that resolves with a JSON object { make: string, model: string, year: string }.
 *          Returns empty strings if detection fails or parsing fails.
 */
// Define your 1st gen HTTPS function
export const generateCarDescriptionWithGemini = functions
// Include memory, timeout, AND the secrets array in the runWith options
  .runWith({
    memory: "8GB", // Or whatever memory you need
    timeoutSeconds: 120, // Or whatever timeout you need
    secrets: ["GOOGLE_API_KEY"], // <--- ADD YOUR SECRET NAME HERE!
  })
  .https.onRequest(async (req, res) => {
    // Wrap your function logic with the CORS handler
    corsHandler(req, res, async () => {
      console.log("Function received a request:", req.method, req.url);

      // In 1st gen onRequest, the image data won't come in `req.data`.
      // It will likely be in the request body.
      // You'll need to parse the body based on how the client sends it (e.g., JSON, multipart/form-data).
      // Let's assume for this example the client sends a POST request with JSON body:
      // { "base64Image": "...", "mimeType": "..." }

      if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
      }


      // Handle authenticated POST from frontend with poster generation data
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


      // --- AI Logic starts here ---
      // Extract car details from the request data
      console.log("Request body:", req.body);
      const carDetails = req.body;

      // Validate input
      if (!carDetails) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Car details object is required."
        );
      }

      if (!carDetails.make || typeof carDetails.make !== 'string') {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Car make is a required string."
        );
      }

      if (!carDetails.model || typeof carDetails.model !== 'string') {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Car model is a required string."
        );
      }

      // --- AI Logic starts here ---

      try {
        // Initialize the Generative AI client using the securely available API key
        // process.env.GOOGLE_API_KEY is available because we included GOOGLE_API_KEY in the `secrets` array above
        if (!process.env.GOOGLE_API_KEY) {
          console.error("GOOGLE_API_KEY secret is not available.");
          throw new functions.https.HttpsError(
            "internal",
            "Server configuration error: AI key not found."
          );
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const flashModel = genAI.getGenerativeModel({model: GEMINI_FLASH_MODEL_NAME});

        // Prepare the content for the API call
        const parts = [
          {
            text: `${carDetails.make} ${carDetails.model} ${carDetails.year}. Write a description of that exact make/model/year of car. Ensure the description is around 110 words and 1 paragraph long, informative (engine specs), just slightlyyy formal, and exciting to read for any car enthusiast. Just like a magazine feature! Don't try to sell it, rather raise the ego of the owner, but written for the public. Don't make it cheesy. If the make and model are unknown, just return "Unknown make/model" and nothing else.`,
          },
        ];

        console.log("Calling Gemini API...");
        // Make the call to the Gemini API
        const result = await flashModel.generateContent({
          contents: [{parts, role: "user"}],
          generationConfig,
          safetySettings,
        });

        console.log("Received response from Gemini API: " + result);

        const response = await result.response;
        const text = response.text();

        return res.status(200).json({text});
      } catch (error) {
        console.error("Error:", error);
        throw new functions.https.HttpsError(
          "internal",
          "An error occurred while processing the image."
        );
      }
    });
  });

