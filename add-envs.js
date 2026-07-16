const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const vars = [];
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_')) {
    const parts = trimmed.split('=');
    const name = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    vars.push({ name, value });
  }
});

console.log(`Parsed ${vars.length} environment variables.`);

const targets = ['production', 'preview', 'development'];

function runVercel(args, stdinValue) {
  return new Promise((resolve) => {
    const child = execFile('vercel', args, { timeout: 6000 }, () => resolve());
    // Vercel prompts for the value on stdin when --value is omitted, which
    // avoids passing the secret through a shell-interpolated argv string.
    if (stdinValue !== undefined && child.stdin) {
      child.stdin.end(stdinValue);
    }
  });
}

async function main() {
  const promises = [];
  for (const v of vars) {
    for (const target of targets) {
      console.log(`Queuing ${v.name} for ${target}...`);
      // Pass args as an array (no shell interpolation) and stream the value
      // on stdin so secrets containing quotes, $, or ` are safe.
      promises.push(runVercel(['env', 'add', v.name, target, '--yes', '--force'], v.value));
    }
  }
  
  console.log(`Running all ${promises.length} additions in parallel...`);
  await Promise.all(promises);
  console.log('All environment variables synchronization completed successfully!');
}

main();

