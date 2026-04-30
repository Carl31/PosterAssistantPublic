import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '@/firebase/client'

export type PlateRegion = "NZ" | "AU" | "UK" | "US" | "unsupported" | null;

export const REGION_OPTIONS: { value: PlateRegion; label: string; flag: string }[] = [
  { value: "NZ",          label: "New Zealand",    flag: "🇳🇿" },
  { value: "AU",          label: "Australia",      flag: "🇦🇺" },
  { value: "UK",          label: "United Kingdom", flag: "🇬🇧" },
  { value: "US",          label: "United States",  flag: "🇺🇸" },
  { value: "unsupported", label: "Other",          flag: "🌍" },
];

export const REGION_SERVICE_NAME: Record<string, string> = {
  NZ: "CarJamNz",
  AU: "CarJamAu",
  UK: "DVLA",
  US: "AutoDev",
};

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },        { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },        { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },     { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },    { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },        { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },         { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },       { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },           { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },       { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },          { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },      { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },       { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },       { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },     { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },           { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },         { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },   { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },   { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },          { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },        { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },     { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },      { code: "WY", name: "Wyoming" },
  { code: "DC", name: "Washington D.C." },
];

export const AU_STATES: { code: string; name: string }[] = [
  { code: "NSW", name: "New South Wales" },
  { code: "VIC", name: "Victoria" },
  { code: "QLD", name: "Queensland" },
  { code: "WA",  name: "Western Australia" },
  { code: "SA",  name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NT",  name: "Northern Territory" },
];

const EU_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR",
  "DE","GR","HU","IE","IT","LV","LT","LU","MT","NL",
  "PL","PT","RO","SK","SI","ES","SE","GB","CH","NO","IS","LI",
]);

export function countryCodeToRegion(code: string): PlateRegion {
  if (code === "NZ") return "NZ";
  if (code === "AU") return "AU";
  if (code === "US") return "US";
  if (EU_CODES.has(code)) return "UK";
  return "unsupported";
}

interface UsePlateRegionResult {
  region:      PlateRegion;
  plateState:  string;
  isDetecting: boolean;
  needsManualSelection: boolean;
  saveRegion:     (r: PlateRegion) => Promise<void>;
  savePlateState: (s: string)      => Promise<void>;
}

export function usePlateRegion(userId: string | null | undefined): UsePlateRegionResult {
  const [region, setRegion]                    = useState<PlateRegion>(null);
  const [plateState, setPlateState]            = useState<string>("");
  const [isDetecting, setIsDetecting]          = useState(true);
  const [needsManualSelection, setNeedsManual] = useState(false);

  useEffect(() => {
    if (!userId) { setIsDetecting(false); return; }

    let cancelled = false;

    const run = async () => {
      const userRef = doc(db, "users", userId);

      // 1) Try to load saved region/state from Firestore
      try {
        const snap       = await getDoc(userRef);
        const saved      = snap.get("settings.plateRegion")   as PlateRegion | undefined;
        const savedState = snap.get("settings.plateState")    as string      | undefined;

        if (savedState && !cancelled) setPlateState(savedState);

        if (saved && !cancelled) {
          setRegion(saved);
          setIsDetecting(false);
          return;
        }
      } catch { /* fall through to IP detection */ }

      try {
        const ipRes  = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        if (cancelled) return;

        const detected = countryCodeToRegion(ipData.country_code ?? "");
        setRegion(detected);
        await updateDoc(userRef, { "settings.plateRegion": detected }).catch(() => {});
      } catch {
        if (!cancelled) setNeedsManual(true);
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [userId]);

  const saveRegion = async (newRegion: PlateRegion) => {
    setRegion(newRegion);
    setNeedsManual(false);
    // Clear saved state when region changes — old state is no longer relevant
    setPlateState("");
    if (userId) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        "settings.plateRegion": newRegion,
        "settings.plateState":  "",
      }).catch(console.error);
    }
  };

  const savePlateState = async (newState: string) => {
    setPlateState(newState);
    if (userId) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { "settings.plateState": newState }).catch(console.error);
    }
  };

  return { region, plateState, isDetecting, needsManualSelection, saveRegion, savePlateState };
}