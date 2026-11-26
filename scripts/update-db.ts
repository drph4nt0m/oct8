import { run as runMaxMind } from './jobs/update-maxmind';
import { run as runFireHOL } from './jobs/update-firehol';
import { run as runTor } from './jobs/update-tor';
import { run as runCloud } from './jobs/update-cloud';
import { run as runBuild } from './build-data';

async function main() {
  console.log('Starting Unified Database Update...');

  try {
    await runMaxMind();
    await runFireHOL();
    await runTor();
    await runCloud();
    await runBuild();
  } catch (error) {
    console.error('Database update failed:', error);
    process.exit(1);
  }

  console.log('All database updates completed.');
}

main();
