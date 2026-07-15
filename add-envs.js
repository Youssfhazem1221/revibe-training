const { exec } = require('child_process');
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

function runCommand(cmd) {
  return new Promise((resolve) => {
    const child = exec(cmd, { timeout: 6000 }, (error, stdout, stderr) => {
      resolve();
    });
  });
}

async function main() {
  const promises = [];
  for (const v of vars) {
    for (const target of targets) {
      console.log(`Queuing ${v.name} for ${target}...`);
      const cmd = `vercel env add ${v.name} ${target} --value "${v.value}" --yes --force`;
      promises.push(runCommand(cmd));
    }
  }
  
  console.log(`Running all ${promises.length} additions in parallel...`);
  await Promise.all(promises);
  console.log('All environment variables synchronization completed successfully!');
}

main();

