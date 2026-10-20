import type { MetadataRoute } from "next";

const SITE = "https://song.guidejung.com";

// 검색엔진에 알릴 공개 화면. 새 공개 화면을 만들면 여기에도 추가한다.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/samples", 0.8, "monthly"),
    page("/create", 0.7, "monthly"),
    page("/refund", 0.3, "yearly"),
    page("/terms", 0.2, "yearly"),
    page("/privacy", 0.2, "yearly"),
  ];
}
