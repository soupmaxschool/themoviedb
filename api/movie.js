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

    // Try ratings page first (fastest)
    let imdbRating = null;

    const ratingsPage = await fetch(`https://www.imdb.com/title/${imdbId}/ratings`);
    const ratingsHtml = await ratingsPage.text();

    // Pattern 1: JSON blob
    const jsonKey = `"ratingValue":`;
    let idx = ratingsHtml.indexOf(jsonKey);
    if (idx !== -1) {
      const slice = ratingsHtml.slice(idx + jsonKey.length, idx + jsonKey.length + 10);
      const num = slice.match(/[0-9.]+/);
      if (num) imdbRating = num[0];
    }

    // Pattern 2: "IMDb rating" text fallback
    if (!imdbRating) {
      const textKey = `IMDb rating`;
      idx = ratingsHtml.indexOf(textKey);
      if (idx !== -1) {
        const slice = ratingsHtml.slice(idx, idx + 50);
        const num = slice.match(/[0-9]\.[0-9]/);
        if (num) imdbRating = num[0];
      }
    }

    // Pattern 3: Mobile JSON blob
    if (!imdbRating) {
      const mobilePage = await fetch(`https://m.imdb.com/title/${imdbId}/`);
      const mobileHtml = await mobilePage.text();

      const mobileKey = `IMDbReactInitialState`;
      const start = mobileHtml.indexOf(mobileKey);
      if (start !== -1) {
        const jsonStart = mobileHtml.indexOf("{", start);
        const jsonEnd = mobileHtml.indexOf("</script>", jsonStart);
        const jsonText = mobileHtml.slice(jsonStart, jsonEnd);

        try {
          const data = JSON.parse(jsonText);
          if (data?.ratings?.rating) {
            imdbRating = data.ratings.rating.toString();
          }
        } catch {}
      }
    }

    // Pattern 4: Mobile HTML fallback
    if (!imdbRating) {
      const num = ratingsHtml.match(/[0-9]\.[0-9]/);
      if (num) imdbRating = num[0];
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
