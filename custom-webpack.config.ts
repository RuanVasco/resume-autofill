import type { Configuration } from 'webpack';
import * as path from 'path';

export default (config: Configuration): Configuration => {
  config.entry = {
    ...(config.entry as Record<string, string>),
    background: { import: path.resolve(__dirname, 'src/background.ts'), filename: 'background.js' },
    content: { import: path.resolve(__dirname, 'src/content.ts'), filename: 'content.js' },
  };

  return config;
};
