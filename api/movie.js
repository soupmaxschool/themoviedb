export default async function handler(req, res) {
  try {
    const title = req.query.title;
    if (!title) {
      return res.json({ ok: false, error: "Missing title" });
    }

    // TMDb v4 public mirror (no key needed)
    const tmdb = await fetch(
      `https://api.themoviedb.org/4/search?query=${encodeURIComponent(title)}`
    );
    const data = await tmdb.json();

    if (!data?.results || data.results.length === 0) {
      return res.json({ ok: false, error: "Movie not found" });
    }

    const movie = data.results[0];

    return res.json({
      ok: true,
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.split("-")[0] || null,
      rating: movie.vote_average || null,
      poster: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null
    });

  } catch (err) {
    return res.json({ ok: false, error: err.toString() });
  }
}
