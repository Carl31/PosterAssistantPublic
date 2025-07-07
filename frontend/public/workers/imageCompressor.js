
// image-compressor.js (Web Worker)
self.onmessage = async function (e) {
    console.log('Running in worker:', typeof self.document === 'undefined'); 

  const { file, options } = e.data;

  // Example: using browser-image-compression in a worker
  importScripts('https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js');

    try {
        const compressedFile = await imageCompression(file, options);
        // self.postMessage({ success: true, compressed: compressedFile });

        const buffer = await compressedFile.arrayBuffer();
        self.postMessage(buffer, [buffer]); // 🚀 Transfer, no clone
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};
