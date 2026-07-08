import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import cheerio from "cheerio";

export default async function handler(req, res) {
  const file = path.join(process.cwd(), "movies.json");

  // POST = save movie
  if (req.method === "POST") {
    const movie = req.body;
    const db = JSON.parse(fs.readFileSync(file, "utf8"));
    db.push(movie);
    fs.writeFileSync(file, JSON.stringify(db, null, 2));
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
  const imdbData = JSON.parse(imdbHtml.match(/__NEXT_DATA__"[^>]*>(.*?)<\/script>/)[1]);
  const imdbRating = imdbData.props.pageProps.mainColumnData.aggregateRating.ratingValue;

  // Rotten Tomatoes search → URL
  const rtSearch = await fetch(`https://www.rottentomatoes.com/search?search=${title}`);
  const rtHtml = await rtSearch.text();
  const $rt = cheerio.load(rtHtml);
  const rtUrl = "https://www.rottentomatoes.com" + $rt("search-page-media-row a").attr("href");

  // Rotten Tomatoes page → ratings
  const rtPage = await fetch(rtUrl);
  const rtPageHtml = await rtPage.text();
  const rtJson = JSON.parse(rtPageHtml.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  const critic = rtJson.aggregateRating.ratingValue;
  const audience = rtJson.aggregateRating.ratingCount;

  res.json({
    id: imdbId,
    title: imdbJson.d[0].l,
    year: imdbJson.d[0].y,
    imdb: imdbRating,
    rt_critic: critic,
    rt_audience: audience
  });
}
