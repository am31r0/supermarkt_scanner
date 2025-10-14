export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { name, age, city } = req.body;
    if (!name || !age || !city) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const record = { name, age, city, date: new Date().toISOString() };
    const content = Buffer.from(JSON.stringify(record) + "\n").toString(
      "base64"
    );

    const GITHUB_USER = "am31r0";
    const REPO_NAME = "supermarkt_scanner";
    const FILE_PATH = "src/data/users.jsonl";

    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents/${FILE_PATH}`;

    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const file = await getRes.json();
    const sha = file.sha;
    const existing = Buffer.from(file.content, "base64").toString();
    const newContent = Buffer.from(
      existing + JSON.stringify(record) + "\n"
    ).toString("base64");

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add beta user ${record.name}`,
        content: newContent,
        sha,
        branch: "main",
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      return res
        .status(500)
        .json({ error: "GitHub update failed", details: err });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
