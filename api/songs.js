const songsStore = globalThis.__easychartSongs || (globalThis.__easychartSongs = []);

const normalizeSong = (song) => ({
  id: song.id || `song-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  title: song.title || '',
  artist: song.artist || '',
  key_signature: song.key_signature || 'C',
  tempo: song.tempo || 120,
  song_data: song.song_data || { sections: [] }
});

const sendJson = (res, statusCode, payload) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(statusCode).json(payload);
};

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const { id, search } = req.query || {};

  if (req.method === 'GET') {
    if (id) {
      const song = songsStore.find((item) => item.id === id);
      if (!song) {
        return sendJson(res, 404, { error: 'Song not found' });
      }
      return sendJson(res, 200, song);
    }

    if (search) {
      const query = String(search).toLowerCase();
      const filtered = songsStore.filter((song) =>
        (song.title || '').toLowerCase().includes(query) ||
        (song.artist || '').toLowerCase().includes(query)
      );
      return sendJson(res, 200, filtered);
    }

    return sendJson(res, 200, songsStore);
  }

  if (req.method === 'POST') {
    const payload = req.body || {};
    const song = normalizeSong(payload);
    songsStore.push(song);
    return sendJson(res, 201, song);
  }

  if (req.method === 'PUT') {
    const payload = req.body || {};
    const song = normalizeSong(payload);
    const index = songsStore.findIndex((item) => item.id === song.id);

    if (index === -1) {
      return sendJson(res, 404, { error: 'Song to update was not found' });
    }

    songsStore[index] = song;
    return sendJson(res, 200, song);
  }

  if (req.method === 'DELETE') {
    if (!id) {
      return sendJson(res, 400, { error: 'Missing song id' });
    }

    const filtered = songsStore.filter((song) => song.id !== id);
    globalThis.__easychartSongs = filtered;
    songsStore.length = 0;
    filtered.forEach((song) => songsStore.push(song));
    return sendJson(res, 200, { deleted: true, id });
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
};
