// import 'dotenv/config';
// import { createApp } from './src/app.js';

// const port = Number(process.env.PORT) || 4000;

// createApp().listen(port, () => {
//   console.log(`MMRMS API listening on http://localhost:${port}`);
// });

import 'dotenv/config';
import { createApp } from './src/app.js';

const app = createApp();
const port = Number(process.env.PORT) || 4000;

// Only listen on a port when running locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`MMRMS API listening on http://localhost:${port}`);
  });
}

// Export the app instance for Vercel Serverless execution
export default app;