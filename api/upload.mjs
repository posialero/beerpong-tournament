import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // zdjęcia są wcześniej zmniejszane po stronie klienta do ~128px
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const err = new Error(
        'Brak zmiennej BLOB_READ_WRITE_TOKEN. Podłącz Blob Store w Storage → Create Database → Blob i zrób redeploy.'
      );
      err.code = 'MISSING_ENV';
      throw err;
    }

    const { dataUrl, filename } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Brak danych zdjęcia (dataUrl).' });
    }

    const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) {
      return res.status(400).json({ error: 'Nieprawidłowy format dataUrl.' });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    const safeName = (filename || `player-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');

    const blob = await put(`avatars/${safeName}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Błąd /api/upload:', err);
    return res.status(500).json({
      error: err.code === 'MISSING_ENV' ? err.message : 'Błąd wysyłania zdjęcia do Vercel Blob.',
      detail: err.message,
    });
  }
}
