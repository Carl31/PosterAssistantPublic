import fetch from "node-fetch";

export async function lookupUK(
  plate: string,
  apiKey: string
): Promise<{ make: string; model: string; year: string } | null> {
  const cleanPlate = plate.replace(/\s/g, "").toUpperCase();

  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch(
        "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
        {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({registrationNumber: cleanPlate}),
        }
      );
    } catch (err) {
      console.error(`DVLA UK network error (attempt ${attempt}):`, err);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
      continue;
    }

    // 404 = vehicle not found — no point retrying
    if (res.status === 404) {
      console.warn(`DVLA UK: vehicle not found for plate ${cleanPlate}`);
      return null;
    }

    if (!res.ok) {
      console.warn(`DVLA UK failed (attempt ${attempt}): ${res.status} ${res.statusText}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
      continue;
    }

    const data = await res.json() as {
      make?: string;
      yearOfManufacture?: string;
      monthOfFirstRegistration?: string;
    };

    if (data?.make) {
      return {
        make: data.make ?? "",
        model: "", // DVLA VES does not return model — user will enter manually
        year: data.yearOfManufacture ?
          String(data.yearOfManufacture) :
          (data.monthOfFirstRegistration?.slice(0, 4) ?? ""),
      };
    }

    console.warn(`DVLA UK: no make in response (attempt ${attempt})`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1300));
  }

  return null;
}
