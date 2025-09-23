import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import base from '../openapi/build/openapi.json';

const outDir = join(__dirname, '..', 'openapi', 'build');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(base, null, 2));
console.log('openapi.json written');


