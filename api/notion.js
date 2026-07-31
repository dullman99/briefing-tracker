export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "토큰 없음" });

  const DB_ID = "94ea7057-df22-4272-ad7a-1653e71770de";

  try {
    const items = [];
    let cursor = null;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.message });
      }

      const data = await response.json();

      data.results.forEach(page => {
        const p = page.properties;
        items.push({
          title: p["컨텐츠명"]?.title?.[0]?.plain_text || "(제목없음)",
          channel: p["채널명"]?.rich_text?.[0]?.plain_text || "",
          date: p["날짜"]?.date?.start || "",
          category: p["카테고리"]?.select?.name || "미분류",
          projects: (p["관련 프로젝트"]?.multi_select || []).map(s => s.name),
          done: p["반영완료"]?.checkbox || false,
          link: p["링크"]?.url || null,
        });
      });

      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
