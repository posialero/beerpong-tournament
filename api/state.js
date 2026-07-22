const { kv } = require('@vercel/kv');

const KEY = 'beerpong:state';
const MAX_PLAYERS = 200;      // sensowny sufit bezpieczeństwa
const MAX_NAME_LEN = 60;

function defaultState() {
  return { players: [], results: {} };
}

function isValidState(body) {
  if (!body || typeof body !== 'object') return false;
  if (!Array.isArray(body.players)) return false;
  if (body.players.length > MAX_PLAYERS) return false;
  if (!body.players.every(p => typeof p === 'string' && p.length > 0 && p.length <= MAX_NAME_LEN)) return false;
  if (!body.results || typeof body.results !== 'object' || Array.isArray(body.results)) return false;

  for (const [key, r] of Object.entries(body.results)) {
    if (typeof key !== 'string' || !key.includes('|||')) return false;
    if (!r || typeof r !== 'object') return false;
    if (typeof r.winner !== 'string' || typeof r.loser !== 'string') return false;
    if (typeof r.cupsLeft !== 'number' || r.cupsLeft < 0 || r.cupsLeft > 10) return false;
  }
  return true;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const state = await kv.get(KEY);
      res.status(200).json(state || defaultState());
    } catch (e) {
      res.status(500).json({ error: 'Nie udało się odczytać bazy. Sprawdź czy Vercel KV jest podłączone do projektu.' });
    }
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    // Vercel zwykle parsuje JSON automatycznie, ale na wszelki wypadek:
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (!isValidState(body)) {
      res.status(400).json({ error: 'Nieprawidłowy format danych.' });
      return;
    }
    try {
      await kv.set(KEY, body);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Nie udało się zapisać do bazy. Sprawdź czy Vercel KV jest podłączone do projektu.' });
    }
    return;
  }

  res.status(405).json({ error: 'Metoda niedozwolona' });
};
