import { API_CONFIG } from '../config';

export const saveSong = async (songData) => {
  try {
    const response = await fetch(API_CONFIG.FULL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(songData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.message || 
        `Error ${response.status}: ${response.statusText}`
      );
    }

    return responseData;
    
  } catch (error) {
    console.error('Error al guardar la canción:', error);
    throw error;
  }
};

export const updateSong = async (songId, songData) => {
  try {
    const response = await fetch(API_CONFIG.FULL_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: songId, ...songData })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating song:', error);
    throw error;
  }
};

export const loadSong = async (songId) => {
  try {
    const response = await fetch(`${API_CONFIG.FULL_URL}?id=${songId}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading song:', error);
    throw error;
  }
};

export const searchSongs = async (searchTerm) => {
  try {
    const response = await fetch(`${API_CONFIG.FULL_URL}?search=${encodeURIComponent(searchTerm)}`);
    return await response.json();
  } catch (error) {
    console.error('Error searching songs:', error);
    return [];
  }
};