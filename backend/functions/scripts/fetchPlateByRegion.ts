import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import { defineSecret } from "firebase-functions/params";

import { lookupNZ } from "./plateLookup/nz";
import { lookupAU, type AustralianState } from "./plateLookup/au";
import { lookupUK } from "./plateLookup/uk";
import { lookupUS, type USState } from "./plateLookup/us";

const CAR_JAM_API_KEY = defineSecret("CAR_JAM_API_KEY");
//const AU_PLATE_API_KEY = defineSecret("AU_PLATE_API_KEY");
const UK_DVLA_API_KEY = defineSecret("UK_DVLA_API_KEY");
const US_AUTODEV_API_KEY = defineSecret("US_AUTODEV_API_KEY");

const corsHandler = cors({ origin: true });

export const fetchPlateByRegion = functions
    .runWith({
        memory: "2GB",
        timeoutSeconds: 30,
        secrets: [
            "CAR_JAM_API_KEY",
            "AU_PLATE_API_KEY",
            "UK_DVLA_API_KEY",
            "US_PLATE_API_KEY",
        ],
    })
    .https.onRequest((req, res) => {
        corsHandler(req, res, async () => {
            try {
                if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

                const authHeader = req.headers.authorization ?? "";
                const idToken = authHeader.match(/^Bearer (.+)$/)?.[1];
                if (!idToken) return res.status(401).send("Unauthorized");

                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const { plate, region, state } = req.body as {
                    plate?: string;
                    region?: string;
                    state?: string;
                };

                if (!plate) return res.status(200).json({ status: "no_plate_provided" });
                if (!region) return res.status(200).json({ status: "no_region_provided" });

                if ((region === "US" || region === "AU") && !state) {
                    return res.status(200).json({ status: "no_state_provided" });
                }

                // ── Credit check & deduction ──
                const userRef = admin.firestore().collection("users").doc(decodedToken.uid);
                const userSnap = await userRef.get();
                const remaining = userSnap.get("credits.carJam") ?? 0;
                if (remaining <= 0) return res.status(200).json({ status: "no_credits_left" });

                await userRef.update({
                    "credits.carJam": admin.firestore.FieldValue.increment(-1),
                });

                // ── Route to correct provider ──
                let result: { make: string; model: string; year: string } | null = null;

                switch (region) {
                    case "NZ": result = await lookupNZ(plate, CAR_JAM_API_KEY.value()); break;
                    case "AU": result = await lookupAU(plate, state as AustralianState,CAR_JAM_API_KEY.value()); break;
                    case "UK": result = await lookupUK(plate, UK_DVLA_API_KEY.value()); break;
                    case "US": result = await lookupUS(plate, state as USState, US_AUTODEV_API_KEY.value()); break;
                    default: return res.status(200).json({ status: "unsupported_region" });
                }

                if (!result) return res.status(200).json({ status: "plate_not_found" });

                return res.json(result);
            } catch (err) {
                console.error(err);
                return res.status(500).json({ error: "Internal server error" });
            }
        });
    });