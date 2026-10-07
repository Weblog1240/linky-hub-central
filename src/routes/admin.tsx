import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowDown, ArrowUp, Eye, EyeOff, LogOut, Plus, Trash2, Save } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchLinks, fetchSettings, KINDS, type LinkRow } from "@/lib/weblog";
import { LinkIcon } from "@/components/LinkIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — WEBLOG's" },
      { name: "description", content: "Manage WEBLOG's links, headline and see click counts." },
      { property: "og:title", content: "Admin — WEBLOG's" },
      { property: "og:description", content: "Admin dashboard for WEBLOG's." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (!ready) return null;
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="font-mono text-sm text-muted-foreground hover:text-primary-glow">&lt; back</Link>
        <h1 className="font-display text-3xl text-glow">Admin</h1>
        {session ? (
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /></Button>
        ) : <span className="w-9" />}
      </div>
      {!session ? <AuthForm /> : isAdmin === null ? null : isAdmin ? <Dashboard /> : (
        <p className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">This account is not an admin.</p>
      )}
    </div>
  );
}

const authSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(6).max(72) });

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const p = authSchema.safeParse({ email, password });
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword(p.data)
      : await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "up" && !data.session) toast.success("Check your email to confirm your account.");
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      <p className="font-mono text-xs text-muted-foreground">The first account created becomes the admin.</p>
      <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground hover:text-primary-glow">
        {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

const linkSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(160),
  url: z.string().trim().url().max(500).refine((u) => /^https?:\/\//.test(u), "URL must start with http(s)"),
  kind: z.string(),
});

function Dashboard() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const links = useQuery({ queryKey: ["links"], queryFn: fetchLinks });
  const refresh = () => qc.invalidateQueries({ queryKey: ["links"] });
  const rows = links.data ?? [];
  const total = rows.reduce((a, l) => a + l.clicks, 0);

  const update = async (id: string, patch: Partial<LinkRow>) => {
    const { error } = await supabase.from("links").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    await supabase.from("links").update({ position: b.position }).eq("id", a.id);
    await supabase.from("links").update({ position: a.position === b.position ? a.position + dir : a.position }).eq("id", b.id);
    refresh();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Links" value={rows.length} />
        <Stat label="Total clicks" value={total} />
      </div>

      {settings.data && <SettingsForm initial={settings.data} />}

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-primary-glow">&gt;_ links</h2>
        {rows.map((l, i) => (
          <div key={l.id} className={`rounded-2xl border bg-card p-4 ${l.visible ? "" : "opacity-50"}`}>
            <div className="flex items-center gap-3">
              <LinkIcon kind={l.kind} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.title}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{l.url}</div>
              </div>
              <span className="pill px-3 py-1 font-mono text-xs">{l.clicks} clicks</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => update(l.id, { visible: !l.visible })}>
                {l.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <EditLink link={l} onSaved={refresh} />
              <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        <NewLink nextPos={(rows.at(-1)?.position ?? 0) + 1} onSaved={refresh} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 text-center">
      <div className="font-display text-4xl text-primary-glow">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function LinkFields({ v, set }: { v: z.infer<typeof linkSchema>; set: (v: z.infer<typeof linkSchema>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1"><Label>Type</Label>
        <select value={v.kind} onChange={(e) => set({ ...v, kind: e.target.value })} className="h-9 w-full rounded-md border bg-input px-3 text-sm">
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
      <div className="space-y-1"><Label>Title</Label><Input value={v.title} onChange={(e) => set({ ...v, title: e.target.value })} /></div>
      <div className="space-y-1"><Label>Short description</Label><Input value={v.description} onChange={(e) => set({ ...v, description: e.target.value })} /></div>
      <div className="space-y-1"><Label>Link (URL)</Label><Input value={v.url} placeholder="https://chat.whatsapp.com/..." onChange={(e) => set({ ...v, url: e.target.value })} /></div>
    </div>
  );
}

function NewLink({ nextPos, onSaved }: { nextPos: number; onSaved: () => void }) {
  const empty = { title: "", description: "", url: "", kind: "whatsapp_group" };
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(empty);
  const save = async () => {
    const p = linkSchema.safeParse(v);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { error } = await supabase.from("links").insert({ ...p.data, position: nextPos });
    if (error) return toast.error(error.message);
    toast.success("Link added"); setV(empty); setOpen(false); onSaved();
  };
  if (!open) return <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add link</Button>;
  return (
    <div className="space-y-3 rounded-2xl border border-primary/50 bg-card p-4">
      <LinkFields v={v} set={setV} />
      <div className="flex gap-2"><Button onClick={save}>Add</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </div>
  );
}

function EditLink({ link, onSaved }: { link: LinkRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: link.title, description: link.description ?? "", url: link.url, kind: link.kind });
  const save = async () => {
    const p = linkSchema.safeParse(v);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { error } = await supabase.from("links").update(p.data).eq("id", link.id);
    if (error) return toast.error(error.message);
    setOpen(false); onSaved();
  };
  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Edit</Button>;
  return (
    <div className="mt-2 w-full space-y-3">
      <LinkFields v={v} set={setV} />
      <div className="flex gap-2"><Button size="sm" onClick={save}>Save</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </div>
  );
}

const settingsSchema = z.object({
  title: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(80),
  bio: z.string().trim().max(300),
  avatar_url: z.string().trim().max(500).refine((u) => u === "" || /^https?:\/\//.test(u), "Photo must be a http(s) link"),
});

function SettingsForm({ initial }: { initial: { title: string; tagline: string; bio: string; avatar_url: string | null } }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ ...initial, avatar_url: initial.avatar_url ?? "" });
  const save = async () => {
    const p = settingsSchema.safeParse(v);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { error } = await supabase.from("site_settings").update({ ...p.data, avatar_url: p.data.avatar_url || null, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Page updated"); qc.invalidateQueries({ queryKey: ["settings"] });
  };
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="font-mono text-sm text-primary-glow">&gt;_ page</h2>
      <div className="space-y-1"><Label>Headline</Label><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
      <div className="space-y-1"><Label>Tag line</Label><Input value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></div>
      <div className="space-y-1"><Label>Bio</Label><Textarea value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} /></div>
      <div className="space-y-1"><Label>Profile photo link</Label><Input value={v.avatar_url} placeholder="https://..." onChange={(e) => setV({ ...v, avatar_url: e.target.value })} /></div>
      <Button onClick={save}><Save className="h-4 w-4" /> Save page</Button>
    </section>
  );
}
