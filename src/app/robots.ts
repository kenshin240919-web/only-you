import type { MetadataRoute } from "next";

// 소개·예시·약관 화면만 검색에 노출한다. 주문·선물·관리자 화면과 API는 막는다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/checkout", "/orders", "/songs", "/find", "/gift/"] },
    sitemap: "https://song.guidejung.com/sitemap.xml",
    host: "https://song.guidejung.com",
  };
}
