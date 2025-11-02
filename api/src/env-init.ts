// Load environment variables FIRST before any other imports
import { config } from 'dotenv';

// Load .env.local first (overrides .env), then .env as fallback
config({ path: '.env.local' });
config(); // Load .env

