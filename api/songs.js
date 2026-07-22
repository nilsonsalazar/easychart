const { createClient } = require('@supabase/supabase-js');

const songsStore = globalThis.__easychartSongs || (globalThis.__easychartSongs = []);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

const normalizeSong = (song = {}) => ({
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

const readBody = async (req) => {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }

  return req.body;
};

const getSongsFromSupabase = async () => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase read error:', error);
    return null;
  }

  return data || [];
};

const getSongByIdFromSupabase = async (id) => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data;
};

const searchSongsFromSupabase = async (query) => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase search error:', error);
    return null;
  }

  return data || [];
};

const saveSongToSupabase = async (song) => {
  if (!supabase) {
    return null;
  }

  const normalized = normalizeSong(song);
  const { data, error } = await supabase
    .from('songs')
    .insert([{ ...normalized, song_data: normalized.song_data }])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return null;
  }

  return data;
};

const updateSongInSupabase = async (song) => {
  if (!supabase) {
    return null;
  }

  const normalized = normalizeSong(song);
  const { data, error } = await supabase
    .from('songs')
    .update({
      title: normalized.title,
      artist: normalized.artist,
      key_signature: normalized.key_signature,
      tempo: normalized.tempo,
      song_data: normalized.song_data
    })
    .eq('id', normalized.id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    return null;
  }

  return data;
};

const deleteSongFromSupabase = async (id) => {
  if (!supabase) {
    return null;
  }

  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase delete error:', error);
    return null;
  }

  return true;
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const { id, search } = req.query || {};

  if (req.method === 'GET') {
    if (id) {
      const fromSupabase = await getSongByIdFromSupabase(id);
      if (fromSupabase) {
        return sendJson(res, 200, fromSupabase);
      }

      const song = songsStore.find((item) => item.id === id);
      if (!song) {
        return sendJson(res, 404, { error: 'Song not found' });
      }

      return sendJson(res, 200, song);
    }

    if (search) {
      const fromSupabase = await searchSongsFromSupabase(String(search));
      if (fromSupabase) {
        return sendJson(res, 200, fromSupabase);
      }

      const query = String(search).toLowerCase();
      const filtered = songsStore.filter((song) =>
        (song.title || '').toLowerCase().includes(query) ||
        (song.artist || '').toLowerCase().includes(query)
      );
      return sendJson(res, 200, filtered);
    }

    const fromSupabase = await getSongsFromSupabase();
    if (fromSupabase !== null) {
      return sendJson(res, 200, fromSupabase);
    }

    return sendJson(res, 200, songsStore);
  }

  if (req.method === 'POST') {
    const payload = await readBody(req);
    const song = normalizeSong(payload);

    const fromSupabase = await saveSongToSupabase(song);
    if (fromSupabase) {
      return sendJson(res, 201, fromSupabase);
    }

    songsStore.push(song);
    return sendJson(res, 201, song);
  }

  if (req.method === 'PUT') {
    const payload = await readBody(req);
    const song = normalizeSong(payload);

    const fromSupabase = await updateSongInSupabase(song);
    if (fromSupabase) {
      return sendJson(res, 200, fromSupabase);
    }

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

    const fromSupabase = await deleteSongFromSupabase(id);
    if (fromSupabase !== null) {
      return sendJson(res, 200, { deleted: true, id });
    }

    const filtered = songsStore.filter((song) => song.id !== id);
    globalThis.__easychartSongs = filtered;
    songsStore.length = 0;
    filtered.forEach((song) => songsStore.push(song));
    return sendJson(res, 200, { deleted: true, id });
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
};
