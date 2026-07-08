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

    // Fetch IMDb MOBILE page (stable JSON blob)
    const mobilePage = await fetch(`https://m.imdb.com/title/${imdbId}/`);
    const html = await mobilePage.text();

    // Find the JSON blob
    const start = html.indexOf("IMDbReactInitialState");
    if (start === -1) {
      return res.json({
        ok: true,
        id: imdbId,
        title: first.l,
        year: first.y,
        imdb: null
      });
    }

    const jsonStart = html.indexOf("{", start);
    const jsonEnd = html.indexOf("</script>", jsonStart);
    const jsonText = html.slice(jsonStart, jsonEnd);

    let data = null;
    try {
      data = JSON.parse(jsonText);
    } catch {
      data = null;
    }

    let imdbRating = null;

    if (data && data.ratings && data.ratings.rating) {
      imdbRating = data.ratings.rating.toString();
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
