import { router, usePathname } from "expo-router";
import { useEffect } from "react";

export default function IndexRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/" || !pathname) {
      router.replace("/landing-page");
    }
  }, [pathname]);

  return null;
}
