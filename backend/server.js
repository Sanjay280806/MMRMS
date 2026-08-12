import 'dotenv/config';
import { createApp } from './src/app.js';

const port = Number(process.env.PORT) || 4000;

createApp().listen(port, () => {
  console.log(`MMRMS API listening on http://localhost:${port}`);
});
