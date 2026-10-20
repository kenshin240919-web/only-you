import Link from "next/link";
import Mascot from "./Mascot";

export default function EmptyState({ title, desc, href, cta }: { title: string; desc: string; href: string; cta: string }) {
  return (
    <div className="container narrow page-head">
      <Mascot size={120} className="empty-mascot" />
      <h1>{title}</h1>
      <p>{desc}</p>
      <p style={{ marginTop: 20 }}>
        <Link href={href} className="btn">
          {cta}
        </Link>
      </p>
    </div>
  );
}
