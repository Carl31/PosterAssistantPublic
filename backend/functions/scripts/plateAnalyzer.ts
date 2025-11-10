import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import {GoogleGenerativeAI, HarmCategory, HarmBlockThreshold} from "@google/generative-ai";
import {env} from "process";

const corsHandler = cors({origin: true});
const GEMINI_FLASH_MODEL_NAME = "gemini-2.0-flash";

const safetySettings = [
  {category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
  {category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
  {category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
  {category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
];

const generationConfig = {
  temperature: 0.3,
  topK: 32,
  topP: 0.95,
  maxOutputTokens: 256,
};

export const detectCarPlate = functions
  .runWith({
    memory: "8GB",
    timeoutSeconds: 120,
    secrets: ["GOOGLE_API_KEY"],
  })
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const authHeader = req.headers.authorization || "";
        const match = authHeader.match(/^Bearer (.+)$/);
        const idToken = match?.[1];
        if (!idToken) return res.status(401).send("Unauthorized: No token provided");

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("User ID:", decodedToken.uid);

        const {imageUrl} = req.body as { imageUrl: string };
        if (!imageUrl) throw new functions.https.HttpsError("invalid-argument", "imageUrl required");

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);

        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
        const base64Image = buffer.toString("base64");

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const flashModel = genAI.getGenerativeModel({model: GEMINI_FLASH_MODEL_NAME});

        const parts = [
          {inlineData: {mimeType, data: base64Image}},
          {
            text: `Detect the vehicle license plate from this photo. 
Return ONLY a JSON object:
{ "plate": "XXXXXX" }
If none visible, return { "plate": "" }`,
          },
        ];

        const geminiResult = await flashModel.generateContent({
          contents: [{role: "user", parts}],
          generationConfig,
          safetySettings,
        });

        const text = (await geminiResult.response.text())
          .replace(/^```json\n?/, "")
          .replace(/\n?```$/, "")
          .trim();

        let plateData;
        try {
          plateData = JSON.parse(text);
        } catch {
          return res.status(200).json({status: "plate_not_found"});
        }

        const plate = (plateData.plate || "").replace(/\s+/g, "").toUpperCase();

        console.log("Plate:", plate);
        if (!plate) return res.status(200).json({status: "plate_not_found_by_gemini"});
        return res.status(200).json({plate: plate});
      } catch (err) {
        console.error(err);
        return res.status(500).json({error: "Internal server error"});
      }
    });
  });
