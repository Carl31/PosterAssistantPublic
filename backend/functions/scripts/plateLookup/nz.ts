import fetch from "node-fetch";

export async function lookupNZ(
  plate: string,
  apiKey: string
): Promise<{ make: string; model: string; year: string } | null> {
  const url = `https://www.carjam.co.nz/a/vehicle:abcd?key=${apiKey}&plate=${plate}&mvr=0`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.make) {
        return {
          make:  data.make                ?? "",
          model: data.model               ?? "",
          year:  data.year_of_manufacture ?? "",
        };
      }
    }
    console.warn(`CarJam NZ attempt ${attempt} failed: ${res.status}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
  }

  return null;
}