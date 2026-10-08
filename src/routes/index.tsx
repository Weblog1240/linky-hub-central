import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchLinks, fetchSettings, KINDS } from "@/lib/weblog";
import { LinkIcon } from "@/components/LinkIcon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WEBTECH — Join our WhatsApp & Telegram community" },
      { name: "description", content: "Pick your channel: WhatsApp group, WhatsApp channel, Telegram group or Telegram channel." },
      { property: "og:title", content: "WEBTECH — Join the community" },
      { property: "og:description", content: "All our WhatsApp and Telegram links in one place." },
      { property: "og:site_name", content: "WEBTECH" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "WEBTECH — Join the community" },
      { name: "twitter:description", content: "All our WhatsApp and Telegram links in one place." },
    ],
  }),
  component: Index,
});

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toISOString().slice(11, 19) + " UTC");
    f();
    const i = setInterval(f, 1000);
    return () => clearInterval(i);
  }, []);
  return <span>{t}</span>;
}

function Index() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings, refetchInterval: 45 * 60 * 1000 });
  const links = useQuery({ queryKey: ["links"], queryFn: fetchLinks });
  const s = settings.data;
  const visible = (links.data ?? []).filter((l) => l.visible);

  const open = (id: string) => {
    void supabase.rpc("track_click", { _link_id: id });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-12">
      <div className="flex items-center justify-between py-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />SYSTEM_ONLINE</span>
        <Clock />
      </div>

      <header className="mt-6 flex flex-col items-center text-center">
        <div className="glow flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-secondary">
          {s?.avatar_src ? (
            <img src={s.avatar_src} alt={s.title} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-5xl text-primary-glow">W</span>
          )}
        </div>
        <span className="pill mt-6 px-4 py-1.5 font-mono text-sm text-primary-glow">&gt;_ {s?.tagline ?? "loading..."}</span>
        <h1 className="text-glow mt-4 font-display text-5xl">{s?.title ?? "WEBTECH"}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{s?.bio}</p>
        <span className="pill mt-6 flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success" /> Choose where to join
        </span>
      </header>

      <main className="mt-8 flex flex-col gap-3">
        {links.isLoading && <p className="text-center font-mono text-sm text-muted-foreground">fetching links...</p>}
        {visible.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => open(l.id)}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-4 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary hover:glow"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <LinkIcon kind={l.kind} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{l.title}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {l.description || KINDS.find((k) => k.value === l.kind)?.label}
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary-glow" />
          </a>
        ))}
        {!links.isLoading && visible.length === 0 && (
          <p className="text-center text-muted-foreground">No links yet.</p>
        )}
      </main>
    </div>
  );
}
