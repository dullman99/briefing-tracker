export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let token = null;

  // body에서 토큰 추출 (여러 방식 시도)
  if (req.body && typeof req.body === "object" && req.body.token) {
    token = req.body.token;
  } else if (req.body && typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      token = parsed.token;
    } catch(e) {}
  }

  if (!token) {
    // 디버그용: body 내용 반환
    return res.status(401).json({ 
      error: "토큰 없음",
      debug_body_type: typeof req.body,
      debug_body: JSON.stringify(req.body).slice(0, 100)
    });
  }

  const DB_ID = "89387015-a0e5-4fc8-a25d-647e2953eabb";

  try {
    const items = [];
    let cursor = null;
    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const response = await fetch("https://api.notion.com/v1/databases/" + DB_ID + "/query", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
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
      data.results.forEach(function(page) {
        const p = page.properties;
        items.push({
          title: (p["컨텐츠명"] && p["컨텐츠명"].title && p["컨텐츠명"].title[0]) ? p["컨텐츠명"].title[0].plain_text : "(제목없음)",
          channel: (p["채널명"] && p["채널명"].rich_text && p["채널명"].rich_text[0]) ? p["채널명"].rich_text[0].plain_text : "",
          date: (p["날짜"] && p["날짜"].date) ? p["날짜"].date.start : "",
          category: (p["카테고리"] && p["카테고리"].select) ? p["카테고리"].select.name : "미분류",
          projects: (p["관련 프로젝트"] && p["관련 프로젝트"].multi_select) ? p["관련 프로젝트"].multi_select.map(function(s) { return s.name; }) : [],
          done: (p["반영완료"] && p["반영완료"].checkbox) ? true : false,
          link: (p["링크"] && p["링크"].url) ? p["링크"].url : null
        });
      });
      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);
    res.status(200).json({ items: items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
