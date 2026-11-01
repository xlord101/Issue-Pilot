import { createFileRoute } from "@tanstack/react-router";
import { GatedLayout } from "@/components/ip/gate";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: () => <GatedLayout />,
});
