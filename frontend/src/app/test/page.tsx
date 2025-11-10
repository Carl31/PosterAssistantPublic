"use client";

import { useState } from "react";

export default function Page() {
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const CARJAM_BASE_URL = "https://www.carjam.co.nz/car/?plate=";
  const MAX_CARJAM_RETRIES = 10;
  const CARJAM_DELAY_MS = 1000;

  async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchCarJamData(plate: string): Promise<string> {
    const urlString = `${CARJAM_BASE_URL}${plate}`;
    const res = await fetch(urlString);
    if (!res.ok) throw new Error(`CarJam fetch failed: ${res.status}: ${res}`);
    return await res.text();
  }

  function parseCarJamHtml(html: string): { make?: string; model?: string; year?: string } | null {
    // Known “not found” page
    if (html.includes("Vehicle information, stolen status, history")) return null;

    // Extract from <title> e.g. "Report - L0DI - 2006 HONDA CRV in White"
    const match = html.match(/Report - .*? - (\d{4})\s+([A-Z0-9]+)\s+([A-Z0-9]+)/i);
    if (!match) return null;

    const [, year, make, model] = match;
    return { make, model, year };
  }

  async function handleCheck() {
    if (!plate) return alert("Enter a plate");
    setLoading(true);
    setResult("");

    try {
      for (let i = 0; i < MAX_CARJAM_RETRIES; i++) {
        const html = await fetchCarJamData(plate);
        const carData = parseCarJamHtml(html);
        if (carData) setResult(JSON.stringify(carData, null, 2));
        await delay(CARJAM_DELAY_MS);
      }
      const res = await fetch(`https://www.carjam.co.nz/car/?plate=${plate}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      setResult(html.slice(0, 2000)); // show first 2000 chars only
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-semibold">CarJam Test</h1>
      <input
        type="text"
        value={plate}
        onChange={(e) => setPlate(e.target.value.toUpperCase())}
        placeholder="Enter license plate"
        className="border rounded p-2 w-full"
      />
      <button
        onClick={handleCheck}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        {loading ? "Loading..." : "Fetch CarJam Data"}
      </button>

      {result && (
        <pre className="whitespace-pre-wrap text-sm border p-2 bg-gray-700 rounded max-h-96 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  );
}
