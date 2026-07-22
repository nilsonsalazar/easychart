const DEFAULT_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:4000' : '');
const DEFAULT_API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || '/api/songs';

export const API_BASE_URL = DEFAULT_API_BASE_URL;
export const API_ENDPOINT = DEFAULT_API_ENDPOINT;
export const API_URL = `${API_BASE_URL}${API_ENDPOINT}`;

export const API_CONFIG = {
  BASE_URL: DEFAULT_API_BASE_URL,
  ENDPOINT: DEFAULT_API_ENDPOINT,
  get FULL_URL() {
    return `${this.BASE_URL}${this.ENDPOINT}`;
  }
};