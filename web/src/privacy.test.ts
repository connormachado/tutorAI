// Cheap guardrails for PRIVACY.md in the browser. Child content must never be persisted
// client-side (P-1, P-10) and nothing may phone home (P-2, P-11).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

function stylesheets(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return stylesheets(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

describe("browser privacy guardrails", () => {
  const files = sources(join(root, "src")).map((path) => ({ path, text: readFileSync(path, "utf8") }));

  it("never touches browser storage", () => {
    const banned = /\b(localStorage|sessionStorage|indexedDB|document\.cookie|caches\.open|serviceWorker)\b/;
    expect(files.filter((f) => banned.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("never logs to the console", () => {
    expect(files.filter((f) => /\bconsole\.\w+\(/.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("has no analytics or error-tracking dependencies", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<string, Record<string, string>>;
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const phoneHome = /sentry|posthog|analytics|segment|mixpanel|amplitude|hotjar|datadog|intercom|logrocket|fullstory|bugsnag|rollbar|gtag/i;
    expect(deps.filter((d) => phoneHome.test(d))).toEqual([]);
  });

  it("loads no remote scripts, styles or fonts", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).not.toMatch(/(src|href)="https?:/);
    for (const path of stylesheets(join(root, "src"))) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(/(@import|url\()\s*["']?https?:/);
    }
  });
});
