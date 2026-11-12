import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { subscribeSystemTheme } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  useEffect(() => subscribeSystemTheme(), []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
