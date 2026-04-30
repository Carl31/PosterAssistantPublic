import fetch from "node-fetch";

export type AustralianState = "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA";


export async function lookupAU(
  plate: string,
  state: AustralianState,
  apiKey: string
): Promise<{ make: string; model: string; year: string } | null> {
  const url =
    `https://www.carjam.co.nz/api/car-au/?key=${apiKey}` +
    `&plate=${plate}&state=${state}&query_type=LU&f=json`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.make) {
        return {
          make: data.make ?? "",
          model: data.model ?? "",
          year: data.year_of_manufacture ?? "",
        };
      }
    }
    console.warn(`CarJam AU attempt ${attempt} failed: ${res.status}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
  }

  return null;
}
