import * as pdfjsLib from 'pdfjs-dist';

// Keep the worker URL in sync with the other pdf.js call sites.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const THUMB_WIDTH = 720; // HQ source; card is ~380px, Retina doubles it

/**
 * Render page 1 of a PDF (by URL) to a high-quality JPEG data URL.
 * PDFs are vector, so rendering large stays crisp.
 * @param {string} url - Public PDF URL
 * @returns {Promise<string|null>} data URL, or null on failure
 */
export async function generateThumbnailFromUrl(url) {
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);
    const thumbScale = THUMB_WIDTH / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale: thumbScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (err) {
    console.warn('Failed to generate thumbnail from URL:', err);
    return null;
  }
}
