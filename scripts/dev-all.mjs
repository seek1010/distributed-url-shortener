import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const outputsPath = resolve(root, 'cdk-outputs.json');
const checkOnly = process.argv.includes('--check');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(outputsPath)) {
  fail(
    [
      'Missing cdk-outputs.json.',
      'Run this once first:',
      'npm run deploy:outputs',
    ].join('\n')
  );
}

let raw;
try {
  raw = JSON.parse(readFileSync(outputsPath, 'utf8'));
} catch {
  fail('cdk-outputs.json is not valid JSON. Re-run: npm run deploy:outputs');
}

const stack = Object.values(raw).find(
  (v) => typeof v === 'object' && v !== null && 'CloudFrontURL' in v
);

if (!stack || typeof stack !== 'object') {
  fail('Could not find CloudFrontURL in cdk-outputs.json. Re-run: npm run deploy:outputs');
}

const cfDomain = stack.CloudFrontURL;
if (typeof cfDomain !== 'string' || !cfDomain.startsWith('http')) {
  fail('CloudFrontURL in cdk-outputs.json is invalid. Re-run: npm run deploy:outputs');
}

const shortenApi = `${cfDomain}/shorten`;
const childEnv = {
  ...process.env,
  VITE_CF_DOMAIN: cfDomain,
  VITE_SHORTEN_API: shortenApi,
};

if (checkOnly) {
  console.log(`VITE_CF_DOMAIN=${cfDomain}`);
  console.log(`VITE_SHORTEN_API=${shortenApi}`);
  process.exit(0);
}

console.log(`Starting dashboard with ${cfDomain}`);
const child = spawn('npm', ['--prefix', 'dashboard', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: childEnv,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
