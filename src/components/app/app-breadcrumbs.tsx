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
      <ol className="flex items-center">
        {items.map((item, i) => (
          <li key={i} className="flex items-center">
            {i > 0 && (
              <span className="mx-2" aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#CBD5E1]" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
