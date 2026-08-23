import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';

// @ts-ignore
globalThis.WebSocket = WebSocket;


import { WorkflowMachine } from '../../engine/workflow/machine';
import { GraphBuilder } from '../../engine/graph/builder';
import { runInvestigation } from '../ai/agent.js'; 
import askTraceRouter from './routes/ask.js';
import { startMonitor } from '../../engine/monitor.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

app.post('/api/investigate', async (req, res) => {
  try {
    const { query, targetType, targetId, merchantId } = req.body;
    
    const apiKey = req.headers['x-ai-key'] as string;
    
    if (!query && !targetId) {
      return res.status(400).json({ error: 'Missing query or targetId' });
    }

    const report = await runInvestigation({ query, merchantId, targetId, targetType, apiKey });
    res.json(report);
  } catch (error: any) {
    console.error("API Error:", error);
    if (error.message?.includes('Rate Limit')) {
      return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});
// Phase 5: Workflow Action Engine
app.post('/api/workflow', async (req, res) => {
  try {
    const result = await WorkflowMachine.execute(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Workflow error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Phase 5: Dynamic Graph API
app.get('/api/graph/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const merchantId = req.query.merchantId as string || 'TEST_MERCHANT';
    const graph = await GraphBuilder.build(type, id, merchantId);
    res.json(graph);
  } catch (error: any) {
    console.error('Graph build error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.use('/api/ask', askTraceRouter);

// Phase 6: Data Simulator Endpoints
app.post('/api/simulator/scenario', async (req, res) => {
  try {
    const { scenario, merchantId } = req.body;
    // For local simulation, we can just shell out to a local script, or run arbitrary logic
    // Since this is the Node backend, we'll execute the seed logic directly here or via the TS runner.
    // To keep it simple, we will return success and instruct the frontend.
    // In a real app, we'd import the seed logic. Here we'll shell out to seed.ts if needed, but since we are running TS, we can just run a subprocess.
    const { exec } = await import('child_process');
    
    let envScenario = scenario;
    
    let scriptPath = 'benchmark/seed.ts';
    if (envScenario === 'BULK_1000') {
      scriptPath = 'benchmark/seed_large.ts';
    } else if (envScenario === 'RESET') {
      scriptPath = 'benchmark/reset.ts';
    }
    
    // Execute script
    exec(`npx tsx ${scriptPath}`, { 
      env: { ...process.env, SEED_SCENARIO: envScenario, FORCE_COLOR: 'true' }
    }, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('Seed error:', error);
        return res.status(500).json({ error: error.message, stdout, stderr });
      }
      res.json({ success: true, stdout });
    });
  } catch (error: any) {
    console.error('Simulator error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server API is running on http://localhost:${PORT}`);
  startMonitor();
});
