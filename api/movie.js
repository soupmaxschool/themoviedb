export default async function handler(req, res) {
  try {
    const title = req.query.title;
    if (!title) {
      return res.json({ ok: false, error: "Missing title" });
    }

    // IMDb suggestion API requires first letter of title
    const firstLetter = title[0].toLowerCase();

    const imdbSearch = await fetch(
      `https://v2.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(title)}.json`
    );
    const imdbJson = await imdbSearch.json();

    if (!imdbJson.d || imdbJson.d.length === 0) {
      return res.json({ ok: false, error: "Movie not found" });
    }

    const first = imdbJson.d[0];

    return res.json({
      ok: true,
      id: first.id,
      title: first.l,
      year: first.y,
      imdb: null // no rating, as you requested
    });

  } catch (err) {
    return res.json({ ok: false, error: err.toString() });
  }
}
