export default async function handler(req, res) {
  try {
    const title = req.query.title;
    if (!title) {
      return res.json({ ok: false, error: "Missing title" });
    }

    // IMDb suggestion API
    const imdbSearch = await fetch(
      `https://v2.sg.media-imdb.com/suggestion/t/${encodeURIComponent(title)}.json`
    );
    const imdbJson = await imdbSearch.json();

    if (!imdbJson.d || imdbJson.d.length === 0) {
      return res.json({ ok: false, error: "Movie not found on IMDb" });
    }

    const first = imdbJson.d[0];
    const imdbId = first.id;

    // Fetch IMDb page HTML
    const imdbPage = await fetch(`https://www.imdb.com/title/${imdbId}/`);
    const html = await imdbPage.text();

    // Try multiple rating patterns
    let imdbRating = null;

    const patterns = [
      `"aggregateRating":{"ratingValue":`,
      `"ratingValue":`,
      `"ratingValue": "`,
      `"ratingValue":'`,
      `{"ratingValue":`,
      `ratingValue":`,
      `ratingValue": "`,
      `ratingValue": '`,
      `hero-rating-bar__aggregate-rating__score">`,
      `data-testid="hero-rating-bar__aggregate-rating__score">`
    ];

    for (const p of patterns) {
      const idx = html.indexOf(p);
      if (idx !== -1) {
        const slice = html.slice(idx + p.length, idx + p.length + 10);
        const num = slice.match(/[0-9.]+/);
        if (num) {
          imdbRating = num[0];
          break;
        }
      }
    }

    return res.json({
      ok: true,
      id: imdbId,
      title: first.l,
      year: first.y,
      imdb: imdbRating
    });

  } catch (err) {
    return res.json({ ok: false, error: err.toString() });
  }
}
