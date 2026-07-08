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

    // Find the rating safely
    let imdbRating = null;

    // IMDb embeds rating in: "aggregateRating":{"ratingValue":8.7
    const ratingKey = `"aggregateRating":{"ratingValue":`;
    const idx = html.indexOf(ratingKey);

    if (idx !== -1) {
      const slice = html.slice(idx + ratingKey.length, idx + ratingKey.length + 10);
      imdbRating = slice.split(/[^0-9.]/)[0]; // extract number
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
