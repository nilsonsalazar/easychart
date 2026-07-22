const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'songs.json');

const ensureDataFile = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
};

const readSongs = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeSongs = (songs) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(songs, null, 2), 'utf8');
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  });
  res.end(JSON.stringify(payload));
};

const normalizeSong = (song) => ({
  id: song.id || `song-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  title: song.title || '',
  artist: song.artist || '',
  key_signature: song.key_signature || 'C',
  tempo: song.tempo || 120,
  song_data: song.song_data || { sections: [] }
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    });
    res.end();
    return;
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, message: 'easychart api is running' });
    return;
  }

  if (pathname !== '/api/songs') {
    sendJson(res, 404, { error: 'Endpoint not found' });
    return;
  }

  const songs = readSongs();

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    const search = url.searchParams.get('search');

    if (id) {
      const song = songs.find((item) => item.id === id);
      if (!song) {
        sendJson(res, 404, { error: 'Song not found' });
        return;
      }
      sendJson(res, 200, song);
      return;
    }

    if (search) {
      const query = search.toLowerCase();
      const filtered = songs.filter((song) =>
        (song.title || '').toLowerCase().includes(query) ||
        (song.artist || '').toLowerCase().includes(query)
      );
      sendJson(res, 200, filtered);
      return;
    }

    sendJson(res, 200, songs);
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const song = normalizeSong(payload);
        const updatedSongs = [...songs, song];
        writeSongs(updatedSongs);
        sendJson(res, 201, song);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid song payload' });
      }
    });
    return;
  }

  if (req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const song = normalizeSong(payload);
        const index = songs.findIndex((item) => item.id === song.id);

        if (index === -1) {
          sendJson(res, 404, { error: 'Song to update was not found' });
          return;
        }

        songs[index] = song;
        writeSongs(songs);
        sendJson(res, 200, song);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid update payload' });
      }
    });
    return;
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      sendJson(res, 400, { error: 'Missing song id' });
      return;
    }

    const filtered = songs.filter((song) => song.id !== id);
    writeSongs(filtered);
    sendJson(res, 200, { deleted: true, id });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, HOST, () => {
  console.log(`EasyChart API running at http://${HOST}:${PORT}`);
});
