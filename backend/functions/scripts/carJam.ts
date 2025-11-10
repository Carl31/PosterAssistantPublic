import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import {env} from "process";
import {defineSecret} from "firebase-functions/params";

const CAR_JAM_API_KEY = defineSecret("CAR_JAM_API_KEY");

const corsHandler = cors({origin: true});

export const fetchPlateWithCarJam = functions
  .runWith({
    memory: "2GB",
    timeoutSeconds: 30,
    secrets: ["CAR_JAM_API_KEY"],
  })
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      const key = CAR_JAM_API_KEY.value();
      try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const authHeader = req.headers.authorization || "";
        const match = authHeader.match(/^Bearer (.+)$/);
        const idToken = match?.[1];
        if (!idToken) return res.status(401).send("Unauthorized: No token provided");

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("User ID:", decodedToken.uid);

        const {plate} = req.body as { plate: string };
        if (! plate ) throw new functions.https.HttpsError("invalid-argument", "plate required");


        // const plate = "L0DI";
        console.log("Plate:", plate);
        if (!plate) return res.status(200).json({status: "plate_not_found_by_gemini"});

        const url = `https://www.carjam.co.nz/a/vehicle:abcd?key=${key}&plate=${plate}&mvr=0`;

        let carJamResponse;
        let carJamData;

        for (let attempt = 1; attempt <= 3; attempt++) {
          carJamResponse = await fetch(url);

          if (carJamResponse && carJamResponse.ok) {
            carJamData = await carJamResponse.json();
            if (carJamData?.make) break;
          }

          console.warn(`CarJam fetch failed (attempt ${attempt}): ${carJamResponse?.status}`);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
        }

        if (!carJamResponse || !carJamResponse.ok || !carJamData) {
          return res.status(200).json({
            status: "plate_not_found_in_carjam",
            statusMessage: `${carJamResponse?.status}: ${carJamResponse?.statusText}`,
          });
        }

        console.log("CarJam response:", carJamData);
        const {make, model, year_of_manufacture: year} = carJamData;

        return res.json({make, model, year});
      } catch (err) {
        console.error(err);
        return res.status(500).json({error: "Internal server error"});
      }
    });
  });
