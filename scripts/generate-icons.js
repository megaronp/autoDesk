import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcImage = 'public/assets/aistudio/file_000000007a38820eb3e55d584a0cb79f_f363a66d.png';
const bgColor = { r: 13, g: 13, b: 17, alpha: 1 };

async function generate() {
  console.log('Generating PWA icons...');
  // Get trimmed logo buffer
  const trimmedBuffer = await sharp(srcImage).trim().toBuffer();

  // Helper to create square icon
  async function createSquareIcon(size, innerSize, outputPath) {
    const resizedLogo = await sharp(trimmedBuffer)
      .resize(innerSize, innerSize, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgColor
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile(outputPath);

    console.log(`Created ${outputPath} (${size}x${size})`);
  }

  await createSquareIcon(192, 150, 'public/pwa-192x192.png');
  await createSquareIcon(512, 420, 'public/pwa-512x512.png');
  // Maskable icon must fit inside 80% circle: 512 * 0.7 = ~350px safe diameter
  await createSquareIcon(512, 330, 'public/pwa-maskable-512x512.png');
  await createSquareIcon(180, 140, 'public/apple-touch-icon.png');
  await createSquareIcon(32, 28, 'public/favicon-32x32.png');
  await createSquareIcon(16, 14, 'public/favicon-16x16.png');
  // Also create favicon.ico as a copy of 32x32 png
  fs.copyFileSync('public/favicon-32x32.png', 'public/favicon.ico');
  console.log('All icons generated successfully!');
}

generate().catch(console.error);
