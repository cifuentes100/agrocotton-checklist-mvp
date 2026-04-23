import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AgroCotton Serviços" },
      {
        name: "description",
        content:
          "Sistema de checklist para colheitadeiras de algodão — MVP em construção.",
      },
    ],
  }),
});

function Index() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0f172a" }}
    >
      <h1
        className="text-5xl font-extrabold tracking-tight sm:text-7xl"
        style={{ color: "#25D366" }}
      >
        AgroCotton
      </h1>
      <p className="mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
        Sistema de checklist para colheitadeiras de algodão — MVP em construção.
      </p>
    </main>
  );
}
