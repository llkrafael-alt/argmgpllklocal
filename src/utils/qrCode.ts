import QRCode from 'qrcode';

/**
 * Generates a valid standard QR Code Data URL (PNG)
 * Uses the proven 'qrcode' standard engine with error correction Level M.
 */
export async function createQRCodeDataUrl(text: string, size = 260): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code with standard engine:', err);
    // Reliable fallback
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=2`;
  }
}
