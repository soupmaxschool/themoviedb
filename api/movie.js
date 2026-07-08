import { kv } from "@vercel/kv";
import fetch from "node-fetch";
import cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    // POST = save movie
    if (req.method === "POST") {
      const movie = req.body;
      await kv.set(movie.id, movie);
      return res.json({ saved: true });
    }

    // GET = scrape movie
    const title = req.query.title;
    if (!title) return res.status(400).json({ error: "Missing title" });

    // IMDb search → ID
    const imdbSearch = await fetch(`https://v2.sg.media-imdb.com/suggestion/t/${title}.json`);
    const imdbJson = await imdbSearch.json();
    const imdbId = imdbJson.d[0].id;

    // IMDb page → rating
    const imdbPage = await fetch(`https://www.imdb.com/title/${imdbId}/`);
    const imdbHtml = await imdbPage.text();
    const $imdb = cheerio.load(imdbHtml);

    const imdbRating = $imdb('[data-testid="hero-rating-bar__aggregate-rating__score"]').text().split('/')[0] || null;

    // Rotten Tomatoes search → URL
    const rtSearch = await fetch(`https://www.rottentomatoes.com/search?search=${title}`);
    const rtHtml = await rtSearch.text();
    const $rt = cheerio.load(rtHtml);
    const rtUrl = "https://www.rottentomatoes.com" + $rt("search-page-media-row a").attr("href");

    // Rotten Tomatoes page → ratings
    const rtPage = await fetch(rtUrl);
    const rtPageHtml = await rtPage.text();
    const $rtPage = cheerio.load(rtPageHtml);

    const critic = $rtPage('[slot="critics-score"]').text().replace('%', '') || null;
    const audience = $rtPage('[slot="audience-score"]').text().replace('%', '') || null;

    const movie = {
      id: imdbId,
      title: imdbJson.d[0].l,
      year: imdbJson.d[0].y,
      imdb: imdbRating,
      rt_critic: critic,
      rt_audience: audience
    };

    return res.json(movie);

  } catch (err) {
    console.error("Backend crash:", err);
    return res.status(500).json({ error: "Server crashed", details: err.toString() });
  }
}
