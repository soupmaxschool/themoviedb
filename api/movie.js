export default async function handler(req, res) {
  try {
    const title = req.query.title;
    if (!title) {
      return res.json({ ok: false, error: "Missing title" });
    }

    // OMDb public mirror (no key needed)
    const omdb = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=short&r=json&apikey=564727fa`
    );
    const data = await omdb.json();

    if (data.Response === "False") {
      return res.json({ ok: false, error: "Movie not found" });
    }

    return res.json({
      ok: true,
      id: data.imdbID,
      title: data.Title,
      year: data.Year,
      imdb: data.imdbRating,
      rt_critic: data.Ratings?.find(r => r.Source === "Rotten Tomatoes")?.Value || null,
      poster: data.Poster
    });

  } catch (err) {
    return res.json({ ok: false, error: err.toString() });
  }
}
