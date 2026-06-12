import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @huggingface/transformers ships node-only optional deps; exclude them so
    // the browser/worker build resolves onnxruntime-web instead.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
