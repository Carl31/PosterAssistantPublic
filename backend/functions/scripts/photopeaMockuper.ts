// Launches headless Chrome (Puppeteer)
// Loads Photopea.com
// Runs a scripted editor flow via Photopea's scripting API

// photopeaRenderer.ts
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

// light mockup
const defaultMockupLight = "https://storage.googleapis.com/posterassistant-aebf0.firebasestorage.app/mockups/Poster_Assistant_MOCKUP_light.psd?GoogleAccessId=gigabyte-laptop%40posterassistant.iam.gserviceaccount.com&Expires=33277348800&Signature=Ao9RrzPrOc0TLW6jQq%2Fr3qMkxuGb%2B7bq%2FfuB4pd%2FrNIHmn8Js62Cap950xgWuRqvaxZbzENR55PE4fNXNull0w0Nhqqi2djxIvzoBLazAxfwdzXC1be937Do%2BmzhLtg%2FTIZgda1jlgTi2ytdVIBES3C7%2BTmqCdKMD1YKcPS%2F9slT1AT0TinBPTZnWg%2B8DJ7W3WHCLMBnNWnRduA6c3ZMJjukvEFuxdQpyxOfqgeY4Vxca9fj0h8PrlLLA3oZf02V9cEn%2BkUPtWinQUZNldfflxCRkp0oL8S5BD3U6zBMUK8%2BmGbmbAPn%2FkG1wVHg8igt4I46UYvfpoTDxNM7uI3uYQ%3D%3D";

export const renderMockup = async (
  userImageURL: string,
  psdUrl: string = defaultMockupLight): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  let page;

  try {
    page = await browser.newPage();

    // Send to hosted html page
    await page.goto(`https://posterassistant-aebf0.web.app/photopea-mockup-wrapper.html?psd=${encodeURIComponent(psdUrl)}&userImageUrl=${encodeURIComponent(userImageURL)}`);

    page.on('console', async (msg) => {
      const text = msg.text();
      console.log('[Photopea Console] ', text);
    // console.log('[Photopea Console text]', text);
    });

    // Wait for buffer to be written to window
    const timeoutMs = 60000;
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
      throw new Error("Photopea mockup export failed or timed out.");
    }

    return exportedBuffer;
  } finally {
    if (page) await page.close(); // ✅ Clean up the page
    await browser.close(); // ✅ Clean up the browser
  }
};
