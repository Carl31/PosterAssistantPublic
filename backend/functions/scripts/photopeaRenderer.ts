// Launches headless Chrome (Puppeteer)
// Loads Photopea.com
// Runs a scripted editor flow via Photopea's scripting API

// photopeaRenderer.ts
import puppeteer from "puppeteer";

type CarDetails = {
    make: string
    model: string
    year: string
}

type RenderInput = {
    psdUrl: string
    userImageUrl: string
    carDetails: CarDetails
    description: string
    instagramHandle: string
}

export async function renderPoster({
  psdUrl,
  userImageUrl,
  carDetails,
  description,
  instagramHandle,
}: RenderInput): Promise<Buffer> {
  const browser = await puppeteer.launch({headless: true}); // Note: used to be ".launch({ headless: 'new' })" but had to downgrade due to incompatability.
  const page = await browser.newPage();

  await page.goto("https://www.photopea.com");

  // Compose a script to run inside Photopea
  const renderScript = `
    async function run() {
      let psd = await app.open("${psdUrl}");

      await app.insertImage("${userImageUrl}", "user_img");

      app.setLayerText("VAR_TEXTS/make", "${carDetails.make}");
      app.setLayerText("VAR_TEXTS/model", "${carDetails.model}");
      app.setLayerText("VAR_TEXTS/year", "${carDetails.year}");
      app.setLayerText("VAR_TEXTS/description", "${description}");
      app.setLayerText("VAR_TEXTS/Instagram", "${instagramHandle}");
      app.setLayerText("VAR_TEXTS/date", "${new Date().toLocaleDateString()}");

      let buffer = await app.saveToBuffer("png");
      return buffer;
    }
    run();
  `;

  const result = await page.evaluate(renderScript);
  await browser.close();

  if (typeof result !== "string") {
    throw new Error("Photopea did not return a valid image string.");
  }
  return Buffer.from(result, "base64");
}
