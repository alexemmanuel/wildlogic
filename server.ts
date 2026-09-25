import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Procedural Grid Generation & Game State API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'active', system: 'Wild Logic Tactical Node Engine v2.4' });
  });

  // Seeded daily/procedural expedition map generator
  app.get('/api/expedition/daily-seed', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);
    res.json({
      date: today,
      seed,
      biomeCycle: ['Solar Spire Basin', 'Neon Mangrove Swamp', 'Ferro-Dune Expanse', 'Reactor Core Ruins'],
      modifier: 'Solar Ion Surge (+1 Logic per turn, but unshielded entities take +2 burn)',
    });
  });

  // Procedural sector generator endpoint
  app.post('/api/grid/generate-sector', (req, res) => {
    const { sectorLevel = 1, biome = 'savannah', seed = Date.now() } = req.body;
    
    // Seeded pseudo-random generator
    let s = Number(seed);
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    const size = 8;
    const grid = [];
    const tileTypes = ['plains', 'ferro_rock', 'ion_spore', 'conductive_pool', 'solar_spire', 'decayed_ruin'];

    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        const roll = rnd();
        let type = 'plains';
        if (roll < 0.12) type = 'ferro_rock'; // Cover / wall
        else if (roll < 0.22) type = 'ion_spore'; // Biohazard
        else if (roll < 0.30) type = 'conductive_pool'; // Conducts electricity
        else if (roll < 0.38) type = 'solar_spire'; // Recharges logic
        else if (roll < 0.44) type = 'decayed_ruin'; // Destructible cover
        
        row.push({
          x,
          y,
          type,
          decayState: type === 'decayed_ruin' ? 2 : 0,
          hazardIntensity: type === 'ion_spore' ? 2 : 0,
        });
      }
      grid.push(row);
    }

    // Ensure player spawn at (1, 6) and companion at (2, 6) are clear plains
    grid[6][1].type = 'plains';
    grid[6][2].type = 'plains';

    res.json({
      success: true,
      sectorLevel,
      biome,
      seed,
      gridSize: size,
      grid,
      weatherConditions: ['Clear Techno-Skies', 'Solar Flare', 'Acid Monsoon', 'EMP Dust Storm', 'Bioluminescent Fog'],
    });
  });

  if (!isProduction) {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wild Logic Server] Tactical Engine listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Wild Logic Server] Startup error:', err);
  process.exit(1);
});
