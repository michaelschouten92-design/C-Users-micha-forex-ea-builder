import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  items: Breadcrumb[];
}

export function AppBreadcrumbs({ items }: AppBreadcrumbsProps): React.ReactNode {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[#7C8DB0] mb-4">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#CBD5E1]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
