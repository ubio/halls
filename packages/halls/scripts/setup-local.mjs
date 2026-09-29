import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.dev.vars')) {
  console.log('.dev.vars already exists; preserved existing settings.');
} else {
  writeFileSync('.dev.vars', 'APP_ORIGIN="http://localhost:3007"\nDEV_MOCK_LOGIN="true"\n', { mode: 0o600 });
  console.log('Local mock login configured. Run npm run dev:halls, then choose Continue as local developer.');
}
