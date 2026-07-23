import { Redis } from '@upstash/redis';

// Obsługuje zarówno zmienne środowiskowe tworzone przez integrację
// "Vercel Marketplace: Upstash" (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
// jak i starsze "Vercel KV" (KV_REST_API_URL / KV_REST_API_TOKEN) — oba są w praktyce
// tym samym Upstash Redis, więc wystarczy poprawnie odczytać dane logowania.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error('Brak zmiennych środowiskowych Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).');
}

const redis = new Redis({ url, token });

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

export default async function handler(req, res) {
  try {
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
    return res.status(500).json({ error: 'Błąd serwera / bazy danych.' });
  }
}
