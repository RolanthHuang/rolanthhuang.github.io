// Writes assets/pinned.json from the repositories pinned on the GitHub profile.
// Runs in GitHub Actions (see .github/workflows/pinned-doors.yml); Node 20 or later.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const login = process.env.GH_LOGIN || "RolanthHuang";
const token = process.env.GH_TOKEN || "";
const OUT = "assets/pinned.json";
const headers = { "User-Agent": "pinned-doors", Accept: "application/vnd.github+json" };

async function viaGraphQL() {
  if (!token) throw new Error("no token");
  const query = `query($login: String!) { user(login: $login) { pinnedItems(first: 6, types: REPOSITORY) { nodes {
    ... on Repository { name description url homepageUrl isPrivate openGraphImageUrl usesCustomOpenGraphImage } } } } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...headers, Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login } })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) throw new Error(`GraphQL: ${res.status} ${JSON.stringify(body.errors || body.message || "")}`);
  return (body.data?.user?.pinnedItems?.nodes || []).filter(n => n && n.name && !n.isPrivate);
}

// Fallback: read the pinned list from the public profile page, then the details from the REST API.
async function viaProfilePage() {
  const html = await (await fetch(`https://github.com/${login}`, { headers })).text();
  const at = html.search(/>\s*Pinned\s*</);
  if (at < 0) return [];
  const section = html.slice(at, html.indexOf("</ol>", at) + 5);
  const names = [...section.matchAll(/<span class="repo"[^>]*>\s*([^<\s]+)\s*<\/span>/g)].map(m => m[1]).slice(0, 6);
  const out = [];
  for (const name of names) {
    const res = await fetch(`https://api.github.com/repos/${login}/${name}`, { headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers });
    if (!res.ok) continue;
    const r = await res.json();
    if (r.private) continue;
    out.push({ name: r.name, description: r.description, url: r.html_url, homepageUrl: r.homepage, openGraphImageUrl: "", usesCustomOpenGraphImage: false });
  }
  return out;
}

let nodes;
try {
  nodes = await viaGraphQL();
} catch (e) {
  console.warn(`Pinned items through GraphQL failed (${e.message}); reading the profile page instead.`);
  nodes = await viaProfilePage();
}

await mkdir("assets/pins", { recursive: true });
const pinned = [];
for (const n of nodes) {
  let preview = "";
  // A custom social preview is worth hanging in a room; GitHub's generated cards are only text.
  if (n.usesCustomOpenGraphImage && n.openGraphImageUrl) {
    try {
      const img = await fetch(n.openGraphImageUrl);
      if (img.ok) {
        const type = img.headers.get("content-type") || "";
        const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
        preview = `assets/pins/${n.name}.${ext}`;
        await writeFile(preview, Buffer.from(await img.arrayBuffer()));
      }
    } catch (e) {
      console.warn(`No preview for ${n.name}: ${e.message}`);
      preview = "";
    }
  }
  pinned.push({ repo: n.name, description: n.description || "", url: n.url, homepage: n.homepageUrl || "", preview });
}

let previous = null;
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch (e) {}
if (previous && JSON.stringify(previous.pinned) === JSON.stringify(pinned)) {
  console.log(`Pins unchanged: ${pinned.map(p => p.repo).join(", ") || "none"}`);
} else {
  const out = {
    source: `Pinned repositories of github.com/${login}, written by .github/workflows/pinned-doors.yml. While fewer than four are pinned, the hall fills its doors from SITE.hall.defaults in assets/projects.js.`,
    updated: new Date().toISOString(),
    pinned
  };
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Pinned: ${pinned.map(p => p.repo).join(", ") || "none"}`);
}
