import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const releaseApiFiles = ['index.php', 'schema.mysql.sql', '.htaccess', 'config.example.php'];

export const prepareRelease = ({
  sourceDir = 'php-api',
  targetDir = 'docker/src/gratulationsdienst/php-api',
} = {}) => {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  releaseApiFiles.forEach(file => copyFileSync(`${sourceDir}/${file}`, `${targetDir}/${file}`));
  return releaseApiFiles.length;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = prepareRelease();
  console.log(`Release unter docker/src/gratulationsdienst vorbereitet (${count} API-Dateien).`);
}
