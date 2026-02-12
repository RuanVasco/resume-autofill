import type { Configuration } from 'webpack';
import * as path from 'path';

export default (config: Configuration): Configuration => {
  config.entry = {
    ...(config.entry as Record<string, string>),
    background: { import: path.resolve(__dirname, 'src/background.ts'), filename: 'background.js' },
    content: { import: path.resolve(__dirname, 'src/content.ts'), filename: 'content.js' },
  };

  // Include webpack runtime in each entry so background.js and content.js are self-contained
  config.optimization = {
    ...config.optimization,
    runtimeChunk: false,
    splitChunks: {
      ...(typeof config.optimization?.splitChunks === 'object' ? config.optimization.splitChunks : {}),
      chunks: (chunk) => chunk.name !== 'background' && chunk.name !== 'content',
    },
  };

  return config;
};
