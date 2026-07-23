export const API_BASE_URL = 'https://visual777.pt';
export const API_ENDPOINT = '/easychart/api.php';
export const API_URL = `${API_BASE_URL}${API_ENDPOINT}`;

export const API_CONFIG = {
  BASE_URL: 'https://visual777.pt',
  ENDPOINT: '/easychart/api.php',
  get FULL_URL() {
    return `${this.BASE_URL}${this.ENDPOINT}`;
  }
};