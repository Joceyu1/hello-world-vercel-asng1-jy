import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "is1-ssl.mzstatic.com",
        pathname: "/image/thumb/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "onecms-res.cloudinary.com",
        pathname:
          "/image/upload/v1682312169/mediacorp/8days/image/2023/04/24/777076-ph.jpg",
        search: "",
      },
    ],
  },
};

export default nextConfig;
