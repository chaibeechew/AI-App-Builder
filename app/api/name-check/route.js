import { NextResponse } from "next/server";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value) {
  return normalize(value).replace(/\s+/g, "");
}

function similarity(a, b) {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.88;
  const setA = new Set(x);
  const setB = new Set(y);
  const intersection = [...setA].filter((ch) => setB.has(ch)).length;
  return intersection / Math.max(setA.size, setB.size, 1);
}

async function appleSearch(name) {
  try {
    const url = `https://itunes.apple.com/search?entity=software&limit=25&term=${encodeURIComponent(name)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.results) ? data.results.map((item) => ({
      source: "Apple App Store",
      name: item.trackName,
      developer: item.artistName,
      url: item.trackViewUrl,
      score: similarity(name, item.trackName),
    })).filter((item) => item.name) : [];
  } catch {
    return [];
  }
}

async function webSignals(name) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`\"${name}\" app`)}`;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!response.ok) return [];
    const html = await response.text();
    const matches = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/g)].slice(0, 8);
    return matches.map((match) => {
      const title = match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
      return { source: "Web search", name: title, score: similarity(name, title) };
    }).filter((item) => item.name);
  } catch {
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = String(searchParams.get("name") || "").trim();
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Enter an App name between 2 and 80 characters." }, { status: 400 });
  }

  const [apple, web] = await Promise.all([appleSearch(name), webSignals(name)]);
  const all = [...apple, ...web].sort((a, b) => b.score - a.score);
  const exact = all.filter((item) => item.score >= 0.98);
  const similar = all.filter((item) => item.score >= 0.72 && item.score < 0.98).slice(0, 8);
  const risk = exact.length ? "high" : similar.length >= 3 ? "medium" : "low";

  return NextResponse.json({
    success: true,
    name,
    risk,
    exact,
    similar,
    checked: ["Apple App Store", "public web search"],
    note: "This is a market-name conflict signal, not trademark or legal clearance. Store results change over time.",
  });
}
