import 'dotenv/config';
import { createApp } from './src/app.js';

const app = createApp();
const rawPort = process.env.PORT;
const port = (rawPort && rawPort !== '8080') ? Number(rawPort) : 4000;

// Listen when running locally (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`MMRMS API listening on http://localhost:${port}`);
  });
}

// Export the app instance for Vercel Serverless execution
export default app;
