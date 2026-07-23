import { Redis } from '@upstash/redis';

const STATE_KEY = 'turniej:state';

function emptyTournament() {
  return {
    players: [],
    matches: [],
    matchSeq: 0,
    swissTotalRounds: 4,
    swissRoundsGenerated: 0,
    playoffGenerated: false,
  };
}

function emptyState() {
  return { beerpong: emptyTournament(), fifa: emptyTournament() };
}

function getRedis() {
  // Obsługuje nazwy zmiennych z integracji "Upstash" ORAZ starsze "Vercel KV"
  // (to w praktyce ten sam Upstash Redis, różnią się tylko nazwy env vars
  // w zależności od tego, jak dodałeś bazę do projektu).
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    const missing = [];
    if (!url) missing.push('UPSTASH_REDIS_REST_URL (lub KV_REST_API_URL)');
    if (!token) missing.push('UPSTASH_REDIS_REST_TOKEN (lub KV_REST_API_TOKEN)');
    const err = new Error(
      `Brak zmiennych środowiskowych: ${missing.join(', ')}. ` +
      `Sprawdź Project Settings → Environment Variables na Vercel i zrób redeploy po ich dodaniu.`
    );
    err.code = 'MISSING_ENV';
    throw err;
  }

  return new Redis({ url, token });
}

export default async function handler(req, res) {
  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      const data = await redis.get(STATE_KEY);
      return res.status(200).json(data || emptyState());
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object' || !body.beerpong || !body.fifa) {
        return res.status(400).json({ error: 'Nieprawidłowy format danych.' });
      }
      await redis.set(STATE_KEY, body);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Błąd /api/state:', err);
    // Zwracamy prawdziwy komunikat błędu, żeby dało się go zobaczyć
    // bezpośrednio w zakładce Network przeglądarki (Response), bez
    // grzebania w logach Vercel. Można to później uprościć/ukryć.
    return res.status(500).json({
      error: err.code === 'MISSING_ENV' ? err.message : 'Błąd serwera / bazy danych.',
      detail: err.message,
    });
  }
}
