import { loadPdfjs, renderPdfPageThumbnail } from './thumbnails';

/**
 * Render page 1 of a PDF (by URL) to a high-quality JPEG data URL.
 * pdf.js is loaded lazily so it stays out of the page's initial bundle.
 * @param {string} url - Public PDF URL
 * @returns {Promise<string|null>} data URL, or null on failure
 */
export async function generateThumbnailFromUrl(url) {
  try {
    const pdfjsLib = await loadPdfjs();
    const pdf = await pdfjsLib.getDocument(url).promise;
    return await renderPdfPageThumbnail(pdf, 1);
  } catch (err) {
    console.warn('Failed to generate thumbnail from URL:', err);
    return null;
  }
}
