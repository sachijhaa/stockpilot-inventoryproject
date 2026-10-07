import axios from 'axios';
import { env } from '../config/env';

export const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 15000,
});
