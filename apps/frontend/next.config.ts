import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export libraries execute on demand in the browser, not during SSR.
  serverExternalPackages: ["jspdf", "jspdf-autotable", "docx"],
  images: {
    domains: ["i.pravatar.cc"],
  },
};

export default nextConfig;
