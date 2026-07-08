import fetch from "node-fetch";
import cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const title = req.query.title;
    if (!title) return res.json({ error: "Missing title" });

    // IMDb suggestion API (no key)
    const imdbSearch = await fetch(`https://v2.sg.media-imdb.com/suggestion/t/${title}.json`);
    const imdbJson = await imdbSearch.json();

    if (!imdbJson.d || imdbJson.d.length === 0) {
      return res.json({ error: "Movie not found on IMDb" });
    }

    const imdbId = imdbJson.d[0].id;

    // IMDb page
    const imdbPage = await fetch(`https://www.imdb.com/title/${imdbId}/`);
    const imdbHtml = await imdbPage.text();
    const $ = cheerio.load(imdbHtml);

    // Safe selector (no regex)
    const ratingText = $('[data-testid="hero-rating-bar__aggregate-rating__score"]').text();
    const imdbRating = ratingText.split('/')[0].trim() || null;

    return res.json({
      ok: true,
      id: imdbId,
      title: imdbJson.d[0].l,
      year: imdbJson.d[0].y,
      imdb: imdbRating
    });

  } catch (err) {
    return res.json({
      ok: false,
      error: err.toString()
    });
  }
}
