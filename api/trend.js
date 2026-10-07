// 네이버 데이터랩 검색어 트렌드로 관광지 검색 인기 순위를 계산합니다.
// Vercel 환경변수 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 필요. 결과는 12시간 캐시됩니다.
const SPOTS = {
  "해운대 해변": ["해운대해수욕장", "해운대 해수욕장", "해운대해변"],
  "광안리·광안대교 야경": ["광안리", "광안리해수욕장", "광안대교"],
  "해변열차·스카이캡슐 (블루라인파크)": ["블루라인파크", "해변열차", "스카이캡슐"],
  "감천문화마을": ["감천문화마을"],
  "흰여울문화마을": ["흰여울문화마을", "흰여울마을"],
  "해동용궁사": ["해동용궁사"],
  "송도 해상케이블카": ["송도해상케이블카", "송도케이블카"],
  "태종대": ["태종대"],
  "자갈치·국제시장": ["자갈치시장", "국제시장", "깡통시장"],
  "BIFF 광장": ["BIFF광장", "비프광장"],
  "더베이101·마린시티": ["더베이101", "마린시티"],
  "엑스더스카이 전망대": ["엑스더스카이"],
  "부산타워·용두산공원": ["부산타워", "용두산공원"],
  "아난티 코브": ["아난티코브", "아난티 부산"],
  "스카이라인 루지": ["스카이라인루지 부산", "부산 루지"],
  "롯데월드 부산": ["롯데월드 부산", "롯데월드어드벤처 부산"],
  "요트 투어": ["부산 요트투어", "광안리 요트"],
  "오륙도 스카이워크": ["오륙도스카이워크", "오륙도"]
};
const ANCHOR = "감천문화마을"; // 모든 묶음에 넣어 기준으로 삼는 관광지

const ymd = d => d.toISOString().slice(0, 10);

async function query(groups, start, end, id, secret) {
  const r = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: start, endDate: end, timeUnit: "date", keywordGroups: groups.map(g => ({ groupName: g, keywords: SPOTS[g] })) })
  });
  if (!r.ok) throw new Error(`naver ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const out = {};
  j.results.forEach(x => { out[x.title] = x.data.reduce((s, p) => s + p.ratio, 0); });
  return out;
}

module.exports = async (req, res) => {
  const id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!id || !secret) { res.statusCode = 500; return res.end(JSON.stringify({ error: "missing_keys" })); }
  try {
    const now = new Date(Date.now() + 9 * 3600e3); // KST
    const end = new Date(now); end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
    const others = Object.keys(SPOTS).filter(k => k !== ANCHOR);
    const batches = [];
    for (let i = 0; i < others.length; i += 4) batches.push([ANCHOR, ...others.slice(i, i + 4)]);
    const results = await Promise.all(batches.map(b => query(b, ymd(start), ymd(end), id, secret)));
    const score = { [ANCHOR]: 100 };
    results.forEach(r => {
      const base = r[ANCHOR] || 1e-9;
      Object.keys(r).forEach(k => { if (k !== ANCHOR) score[k] = r[k] / base * 100; });
    });
    const ranks = Object.entries(score).sort((a, b) => b[1] - a[1])
      .map(([name, s], i) => ({ name, rank: i + 1, score: Math.round(s * 10) / 10 }));
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    res.end(JSON.stringify({ updated: new Date().toISOString(), period: { start: ymd(start), end: ymd(end) }, ranks }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "naver_failed", detail: String(e.message || e).slice(0, 300) }));
  }
};
