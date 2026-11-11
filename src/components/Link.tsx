import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href?: string;
  to?: string;
  children: ReactNode;
}

export default function Link({
  href,
  to,
  className,
  children,
  ...rest
}: LinkProps) {
  const target = href || to || "/";
  let finalHref: string;

  if (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("tel:")
  ) {
    finalHref = target;
  } else if (target.startsWith("#")) {
    finalHref = target;
  } else if (target.startsWith("/#")) {
    finalHref = target.slice(1);
  } else {
    finalHref = `#${target.startsWith("/") ? target : `/${target}`}`;
  }

  return (
    <a href={finalHref} className={cn(className)} {...rest}>
      {children}
    </a>
  );
}

export { Link };
