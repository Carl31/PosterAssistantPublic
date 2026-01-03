// Launches headless Chrome (Puppeteer)
// Loads Photopea.com
// Runs a scripted editor flow via Photopea's scripting API

// photopeaRenderer.ts
import chromium, {font} from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import {format, toZonedTime} from 'date-fns-tz';

type CarDetails = {
    make: string
    model: string
    year: string
}

type PosterRenderInput = {
    psdUrl: string
    userImageUrl: string
    carDetails: CarDetails
    description: string
    instagramHandle: string
    fontsUsed: string[]
    supportedTexts: string[]
    hexColour: string
    hexElements: string[]
    onProgress: (progress: string) => void
}

const psdUrlTest = "https://storage.googleapis.com/posterassistant-aebf0.firebasestorage.app/Preset_simple_white_ONLYTEXT_RED.psd?GoogleAccessId=gigabyte-laptop%40posterassistant.iam.gserviceaccount.com&Expires=1751976000&Signature=TrHw8DN8L6yFzWgcIO6Zh0%2ForX0NDOrXECbrwNf%2BHdTjcpDSXAGD78WBzuBxp5OH%2FprPoixL3bcWz1PcStynU11wQKoExgqskj616vzmVBdxMExNl3KHo5XzN8S1nC9FbxJz1LUx%2BLJht5e3rV9tdCwkrQ4%2B1him%2BJYAKt5WtV0Yi%2FdUlkEMAyY495mYBER2rK5jRdg6635cJfUizEHMEB9eOMFjlOj6lceVET%2B1kSpCUjETRkntPgWRWgvPlRS1tshnticUkJd3PwZ34WGRcq3jkuqxj850cAC53G%2Foz0BiC7BdqQi24VA2%2BOejW9TvLmQvpj0SqORS9uKsP1VLLA%3D%3D";

export const renderPoster = async ({
  psdUrl,
  userImageUrl,
  carDetails,
  description,
  instagramHandle,
  fontsUsed,
  supportedTexts,
  hexColour,
  hexElements,
  onProgress,
}: PosterRenderInput): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  let page;

  try {
    page = await browser.newPage();

    const timeZone = 'Pacific/Auckland'; // Use IANA timezone name
    const now = new Date();
    const nzDate = toZonedTime(now, timeZone);

    // const day = String(now.getDate()).padStart(2, '0');
    // const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    // const year = String(now.getFullYear()).slice(-2); // Get last two digits
    const day = format(nzDate, 'dd'); // e.g. "07"
    const month = format(nzDate, 'MM'); // e.g. "07"
    const year = format(nzDate, 'yy'); // e.g. "2025"
    const formattedDate = `${day}/${month}/${year}`;

    // Send to hosted html page
    // await page.goto(`https://posterassistant-aebf0.web.app/photopea-wrapper.html?psd=${encodeURIComponent(psdUrl)}&userImageUrl=${encodeURIComponent(userImageUrl)}&description=${encodeURIComponent(description)}&instagramHandle=${encodeURIComponent(instagramHandle)}&carMake=${encodeURIComponent(carDetails.make)}&carModel=${encodeURIComponent(carDetails.model)}&carYear=${encodeURIComponent(carDetails.year)}&date=${encodeURIComponent(formattedDate)}`);
    const params = new URLSearchParams({
      psd: psdUrl,
      userImageUrl: userImageUrl,
      description: description,
      instagramHandle: instagramHandle,
      carMake: carDetails.make,
      carModel: carDetails.model,
      carYear: carDetails.year,
      date: formattedDate,
      fontsUsed: fontsUsed.join(','),
      supportedTexts: supportedTexts.join(','),
      hexColour: hexColour,
      hexElements: hexElements.join(','),
    });

    console.log(fontsUsed);

    console.log(params.toString());

    const fullUrl = `https://posterassistant-aebf0.web.app/photopea-wrapper.html?${params.toString()}`;
    await page.goto(fullUrl);

    page.on('console', async (msg) => {
      const text = msg.text();
      console.log('[Photopea Console] ', text.toString());

      if (text.startsWith("[Photopea Progress]")) {
        const progress = text.replace("[Photopea Progress] ", "");
        onProgress(progress);
      }
    });

    // page.on('console', async (msg) => {
    //   for (let i = 0; i < msg.args().length; ++i) {
    //     msg.args()[i].jsonValue().then((val) => {
    //       console.log(`[Photopea Console JSON ] ${JSON.stringify(val, null, 2)}`);
    //     }).catch((err) => {
    //       console.log(`[Photopea Console Error]`, err);
    //     });
    //   }
    // });


    page.on('error', async (event) => {
      console.log(`[Photopea Event] ${event.name}:`, event);
    });

    const listener = (event: { data: any }) => {
      console.log("Received message from Photopea:", event.data);
    };

    (page as any).on('message', listener);


    // Wait for buffer to be written to window
    const timeoutMs = 120000; // 2min
    const start = Date.now();
    let exportedBuffer: Buffer | null = null;

    while (!exportedBuffer && Date.now() - start < timeoutMs) {
      const result = await page.evaluate(() => {
        return (window as any)._exportedPoster || null;
      });

      if (result) {
        exportedBuffer = Buffer.from(result);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!exportedBuffer) {
      throw new Error("Photopea export failed or timed out.");
    }

    return exportedBuffer;
  } finally {
    if (page) await page.close(); // ✅ Clean up the page
    await browser.close(); // ✅ Clean up the browser
  }
};

// Old method: trying to runn Photopea headless
// export const renderPoster = async ({
//   psdUrl,
//   userImageUrl,
//   carDetails,
//   description,
//   instagramHandle,
// }: PosterRenderInput): Promise<Buffer> => {
//   const browser = await puppeteer.launch({
//     args: chromium.args,
//     defaultViewport: chromium.defaultViewport,
//     executablePath: await chromium.executablePath,
//     headless: chromium.headless,
//   });
//   const page = await browser.newPage();

//   let exportedBuffer: Buffer | null = null;
//   // console.log("Using Chrome path:", await chromium.executablePath); // for testing

//   // Hook into browser console to catch exported data
//   page.on("console", async (msg) => {
//     const text = msg.text();
//     if (text.includes('uniconsent.com')) return; // skip noise

//     console.log("[Photopea Console]", text);
//     console.log("[Photopea Console]", msg);

//     // Doesnt capture image as Photopea doesnt send it through the console:
//     for (const arg of msg.args()) {
//       const val = await arg.jsonValue();
//       if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
//         exportedBuffer = Buffer.from(val);
//       }
//     }
//   });

//   await page.goto("https://www.photopea.com/#", {waitUntil: "networkidle0"});

//   // Load PSD file
//   await page.evaluate((psdUrlTest) => {
//     console.log("[Inject] Loading PSD from:", psdUrlTest);
//     window.postMessage(`app.echoToOE("Loaded PSD3"), null, true;`, "*");
//     window.postMessage(`app.open("${psdUrlTest}", null, true);`, "*");
//   }, psdUrlTest);

//   await page.evaluate(() => {
//     console.log("[Inject] test1");
//   });

//   // Give Photopea time to load the PSD
//   await new Promise((resolve) => setTimeout(resolve, 15000)); // TODO: Find a better way to wait for the console to return "done" for example

//   await page.evaluate(() => {
//     console.log("[Inject] test2");
//   });

//   // Optional: Insert user image or update text layers here if needed
//   // You can dynamically inject text into layers if layer names are known

//   await page.evaluate(() => {
//     console.log('[Inject] Checking if document is loaded...');
//     window.postMessage(`app.echoToOE("Doc count: " + app.documents.length), null, true`, "*");
//   });

//   // Export to PNG
//   await page.evaluate(() => {
//     console.log("[Inject] Starting export...");
//     window.postMessage(`app.activeDocument.saveToOE("png");`, "*");
//   });

//   await page.evaluate(() => {
//     console.log("[Inject] test3");
//   });

//   // Wait up to 10 seconds for PNG to be caught from console
//   const timeoutMs = 10000;
//   const start = Date.now();
//   while (!exportedBuffer && Date.now() - start < timeoutMs) {
//     await new Promise((r) => setTimeout(r, 200));
//   }

//   await page.evaluate(() => {
//     console.log("[Inject] test4");
//   });

//   await browser.close();

//   if (!exportedBuffer) {
//     throw new Error("Photopea export failed or timed out.");
//   }

//   return exportedBuffer;
// };
