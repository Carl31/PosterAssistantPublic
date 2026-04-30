import fetch from "node-fetch";

export type USState =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA"
  | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD"
  | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ"
  | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC"
  | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY"
  | "DC";

export async function lookupUS(
  plate: string,
  state: USState,
  apiKey: string
): Promise<{ make: string; model: string; year: string } | null> {
  const url = `https://api.auto.dev/plate/${state}/${encodeURIComponent(plate)}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.make) {
        return {
          make: data.make ?? "",
          model: data.model ?? "",
          year: String(data.year ?? ""),
        };
      }
    }

    // 404 = plate not found or no data — no point retrying
    if (res.status === 404) return null;

    console.warn(`auto.dev NA attempt ${attempt} failed: ${res.status}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
  }

  return null;
}
