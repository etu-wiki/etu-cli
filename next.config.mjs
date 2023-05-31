/**
 * @type {import('next').NextConfig}
 */
export async function redirects() {
  const res = [
    {
      source: `/i/:id/full/:width/0/default.jpg`,
      destination: `/i/:id/thumbnail.jpg`,
      permanent: true,
    },
  ];
  return res;
}

export const eslint = {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  
};

export const typescript = {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
};

// export const output = 'export';

export const compress = true