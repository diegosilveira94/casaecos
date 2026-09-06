import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`API do EcoAgenda ouvindo em http://localhost:${String(env.API_PORT)}`);
});
