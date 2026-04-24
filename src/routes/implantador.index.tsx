import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/implantador/")({
  beforeLoad: () => {
    throw redirect({ to: "/implantador/maquinas" });
  },
});
