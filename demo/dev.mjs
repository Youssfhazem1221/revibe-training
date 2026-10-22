#!/usr/bin/env node
// `npm run dev:preview` — run the site locally with no Firebase/Supabase keys
// and no Google sign-in. Generates sample slide decks into
// public/preview-files/ (git-ignored), then starts `next dev` with
// NEXT_PUBLIC_PREVIEW_MODE=1, which makes next.config.mjs swap Firebase and
// Supabase for the in-memory stand-ins in this folder.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DEMO_MATERIALS } from './content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'preview-files');

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const STOPS = ['#C82D8C', '#7F19A0', '#5019A0'];

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return rgb(...pa.map((v, i) => (v + (pb[i] - v) * t) / 255));
}

function gradient(page, x, y, w, h, steps = 60) {
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const color = t < 0.55 ? mix(STOPS[0], STOPS[1], t / 0.55) : mix(STOPS[1], STOPS[2], (t - 0.55) / 0.45);
    page.drawRectangle({ x: x + (w / steps) * i, y, width: w / steps + 1, height: h, color });
  }
}

function wrap(text, font, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function buildDeck(material) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(material.name);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const W = 960, H = 540;

  material.slides.forEach(([title, body], i) => {
    const page = pdf.addPage([W, H]);
    if (i === 0) {
      gradient(page, 0, 0, W, H);
      page.drawCircle({ x: 860, y: 470, size: 220, color: rgb(1, 1, 1), opacity: 0.07 });
      page.drawText(material.category.toUpperCase(), { x: 72, y: 380, size: 16, font: bold, color: rgb(1, 1, 1), opacity: 0.8 });
      wrap(material.name, bold, 46, 760).forEach((l, n) => page.drawText(l, { x: 72, y: 318 - n * 56, size: 46, font: bold, color: rgb(1, 1, 1) }));
      wrap(body, regular, 20, 700).forEach((l, n) => page.drawText(l, { x: 72, y: 170 - n * 28, size: 20, font: regular, color: rgb(1, 1, 1), opacity: 0.9 }));
      page.drawText('REVIBE', { x: 72, y: 56, size: 22, font: bold, color: rgb(1, 1, 1) });
      return;
    }
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex('#FFFFFF') });
    gradient(page, 0, H - 10, W, 10);
    page.drawRectangle({ x: 72, y: 400, width: 56, height: 6, color: hex('#C82D8C') });
    page.drawText(title, { x: 72, y: 340, size: 40, font: bold, color: hex('#121212') });
    wrap(body, regular, 24, 780).forEach((l, n) => page.drawText(l, { x: 72, y: 276 - n * 36, size: 24, font: regular, color: hex('#3C3C3C') }));
    page.drawText('REVIBE  ·  Training Hub', { x: 72, y: 40, size: 12, font: bold, color: hex('#7F19A0') });
    page.drawText(`${i + 1} / ${material.slides.length}`, { x: W - 120, y: 40, size: 12, font: regular, color: hex('#969696') });
  });
  return pdf.save();
}

fs.mkdirSync(outDir, { recursive: true });
for (const m of DEMO_MATERIALS) {
  const file = path.join(outDir, `${m.id}.pdf`);
  fs.writeFileSync(file, await buildDeck(m));
}
console.log(`[preview] wrote ${DEMO_MATERIALS.length} sample decks to public/preview-files/`);

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_PREVIEW_MODE: '1',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://preview.local',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'preview',
  },
});
child.on('exit', (code) => process.exit(code ?? 0));
