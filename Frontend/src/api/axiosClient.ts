import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: 'http://127.0.0.1:8000', // 對應你的 FastAPI 後端網址
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});