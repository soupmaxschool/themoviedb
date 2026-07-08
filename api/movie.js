export default async function handler(req, res) {
  try {
    const title = req.query.title || "Unknown";

    return res.json({
      ok: true,
      message: "Backend is working",
      title: title
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.toString()
    });
  }
}
