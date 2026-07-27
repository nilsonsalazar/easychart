// config.js
export const API_BASE_URL = 'https://visual777.pt';

// Endpoints
export const API_ENDPOINT = '/easychart/api.php';
export const SONGS_ENDPOINT = '/easychart/song/song.php'; // <--- NUEVO ENDPOINT

// URLs completas
export const API_URL = `${API_BASE_URL}${API_ENDPOINT}`;
export const SONGS_API_URL = `${API_BASE_URL}${SONGS_ENDPOINT}`; // <--- URL DIRECTA AL NUEVO PHP

export const API_CONFIG = {
  BASE_URL: 'https://visual777.pt',
  ENDPOINT: '/easychart/api.php',
  SONGS_ENDPOINT: '/easychart/song/song.php',
  get FULL_URL() {
    return `${this.BASE_URL}${this.ENDPOINT}`;
  },
  get SONGS_URL() {
    return `${this.BASE_URL}${this.SONGS_ENDPOINT}`;
  }
};