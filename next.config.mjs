/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/api/auth/instagram/callback/portal/:token",
        destination: "/portal/:token",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
