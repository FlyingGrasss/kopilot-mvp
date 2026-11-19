import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/mentorlar", "/mentorlar/"],
        disallow: ["/panel", "/giris", "/kayit", "/api/"],
      },
    ],
  };
}
