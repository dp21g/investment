import { spawn, execSync } from 'child_process';
import { createConnection } from 'net';
import pkg from '../package.json'; 

const DB_PORT = 5432;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(port, 'localhost');
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function startDb() {
  console.log('🐳 Checking Postgres status...');
  try {
    // Check if docker is running first
    execSync('docker info', { stdio: 'ignore' });
  } catch (e) {
    console.error('❌ Docker is not running. Please start Docker Desktop and try again.');
    process.exit(1);
  }

  console.log('🚀 Starting Database container...');
  
  try {
      execSync('docker compose up -d db', { stdio: 'inherit' });
  } catch(e) {
      console.error('❌ Failed to start docker container');
      process.exit(1);
  }

  console.log('⏳ Waiting for Database to be ready...');
  
  let retries = 0;
  while (retries < MAX_RETRIES) {
    if (await checkPort(DB_PORT)) {
      console.log('✅ Database is ready!');
      return;
    }
    await new Promise(r => setTimeout(r, RETRY_INTERVAL));
    retries++;
    process.stdout.write('.');
  }
  
  console.error('\n❌ Database failed to become ready in time.');
  process.exit(1);
}

async function runDev() {
  await startDb();

  console.log('✨ Starting development servers...');
  
  // We use the concurrently command defined in package.json or invoke it directly
  // package.json has "concurrently \"npm run dev:frontend\" \"npm run dev:backend\""
  // We can just spawn that command, but better to execute what the original 'dev' script did.
  
  // We need to quote the commands because shell: true strips the array structure
  // and simply concatenates arguments with spaces.
  const command = 'npx';
  const args = ['concurrently', '-c', 'auto', '"npm run dev:frontend"', '"npm run dev:backend"'];

  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

runDev();
