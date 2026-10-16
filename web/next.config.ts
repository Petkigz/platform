import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The sandbox preview is served from a host we do not control, so the dev
  // server must not restrict by origin.
  allowedDevOrigins: ['*.e2b.app'],
};

export default nextConfig;
