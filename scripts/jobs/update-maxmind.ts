import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import 'dotenv/config';

const LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY;
const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!LICENSE_KEY) {
  console.warn('Warning: MAXMIND_LICENSE_KEY is not set. Skipping MaxMind update.');
  process.exit(0); // Exit gracefully so other jobs can run
}

const EDITIONS = ['GeoLite2-City', 'GeoLite2-ASN'];

async function downloadFile(url: string, destPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  if (!res.body) throw new Error(`No body in response for ${url}`);

  const fileStream = fs.createWriteStream(destPath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await finished(Readable.fromWeb(res.body as any).pipe(fileStream));
}

export async function run() {
  console.log('--- Starting MaxMind Update Job ---');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const edition of EDITIONS) {
    console.log(`Downloading ${edition}...`);
    const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${LICENSE_KEY}&suffix=tar.gz`;
    const tarballPath = path.join(DATA_DIR, `${edition}.tar.gz`);

    try {
      await downloadFile(url, tarballPath);
      console.log(`Extracting ${edition}...`);

      const tempDir = path.join(DATA_DIR, `temp_${edition}`);
      fs.mkdirSync(tempDir, { recursive: true });

      execSync(`tar -xzf ${tarballPath} -C ${tempDir}`, { stdio: 'inherit' });

      // Find the mmdb file
      const findFile = (dir: string): string | null => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const found = findFile(fullPath);
            if (found) return found;
          } else if (file.endsWith('.mmdb')) {
            return fullPath;
          }
        }
        return null;
      };

      const mmdbFile = findFile(tempDir);
      if (mmdbFile) {
        const dest = path.join(DATA_DIR, `${edition}.mmdb`);
        fs.renameSync(mmdbFile, dest);
        console.log(`Updated ${dest}`);
      } else {
        console.error(`Could not find .mmdb file for ${edition}`);
      }

      // Cleanup
      fs.rmSync(tarballPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to update ${edition}:`, error);
    }
  }
  console.log('--- MaxMind Update Job Complete ---');
}
