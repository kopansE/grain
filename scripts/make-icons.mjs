// One-off: rasterize public/icons/orbit.svg to the PNG sizes the manifest needs.
// Run with: npx -y sharp-cli@latest ... is awkward on Windows, so we use sharp directly.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const svg = readFileSync(new URL('../public/icons/orbit.svg', import.meta.url));
for (const size of [192, 512]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(fileURLToPath(new URL(`../public/icons/orbit-${size}.png`, import.meta.url)));
  console.log('wrote orbit-' + size + '.png');
}
