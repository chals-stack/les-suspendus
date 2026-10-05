import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[name] ??= value;
  }
}

loadLocalEnv(".env.local");
loadLocalEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase non configuré : ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const endpoint = `${url.replace(/\/$/, "")}/rest/v1/workshops?select=id&limit=1`;
const response = await fetch(endpoint, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!response.ok) {
  console.error(`Connexion Supabase impossible (${response.status}) : ${await response.text()}`);
  process.exit(1);
}

console.log("Connexion Supabase valide et table workshops accessible.");
