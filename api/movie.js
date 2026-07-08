import { put, get } from "@vercel/blob";

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export default async function handler(req, res) {
  try {
    const title = req.query.title;
    if (!title) return res.json({ ok: false, error: "Missing title" });

    const key = `cache/${title.toLowerCase()}.json`;

    // ⭐ 1. Try Blob cache FIRST
    try {
      const cached = await get(key);
      if (cached) {
        const json = await cached.json();
        return res.json({ ok: true, cached: true, ...json });
      }
    } catch {}

    // ⭐ 2. IMDb fetch (only if not cached)
    const firstLetter = title[0].toLowerCase();
    const imdbSearch = await fetch(
      `https://v2.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(title)}.json`
    );
    const imdbJson = await imdbSearch.json();

    if (!imdbJson.d || imdbJson.d.length === 0)
      return res.json({ ok: false, error: "Movie not found" });

    // ⭐ 3. Fuzzy match
    const scored = imdbJson.d.map(item => {
      const name = item.l.toLowerCase();
      const query = title.toLowerCase();
      const lev = levenshtein(name, query);
      const starts = name.startsWith(query) ? 0 : 1;
      const contains = name.includes(query) ? 0 : 1;
      return { item, score: lev + starts + contains };
    });

    scored.sort((a, b) => a.score - b.score);
    const best = scored[0].item;

    const movie = {
      id: best.id,
      title: best.l,
      year: best.y,
      poster: best.i?.imageUrl || null,
      imdb: null
    };

    // ⭐ 4. Save to Blob cache
    await put(key, JSON.stringify(movie), {
      contentType: "application/json"
    });

    return res.json({ ok: true, cached: false, ...movie });

  } catch (err) {
    return res.json({ ok: false, error: err.toString() });
  }
}
