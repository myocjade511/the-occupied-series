const GH_TOKEN = process.env.GH_TOKEN;
const GH_REPO = 'myocjade511/the-occupied-series';
const CSV_PATH = 'data/leads.csv';
const CSV_TOKEN = process.env.CSV_ACCESS_TOKEN;

async function readCSV() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${CSV_PATH}`, {
      headers: { 'Authorization': `Bearer ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return { sha: null, csv: 'Name,Email,Source,Timestamp\n' };
    const data = await res.json();
    const csv = Buffer.from(data.content, 'base64').toString('utf-8');
    return { sha: data.sha, csv };
  } catch(e) { return { sha: null, csv: 'Name,Email,Source,Timestamp\n' }; }
}

async function writeCSV(csv, sha) {
  const content = Buffer.from(csv).toString('base64');
  const body = { message: 'Add lead', content: content };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${CSV_PATH}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    // Require token for CSV download
    const token = req.query.token || '';
    if (!CSV_TOKEN || token !== CSV_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized. Provide ?token=*** to access leads.' });
    }
    const { sha, csv } = await readCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="occupied-leads.csv"');
    return res.status(200).send(csv);
  }

  if (req.method === 'POST') {
    const { name, email } = req.body || {};
    if (name && email && GH_TOKEN) {
      try {
        const { sha, csv } = await readCSV();
        const line = `"${name.replace(/"/g,'""')}","${email.replace(/"/g,'""')}","occupied-series",${new Date().toISOString()}\n`;
        await writeCSV(csv + line, sha);
      } catch(e) { console.error('GitHub save error:', e); }
    }

    const agentmailKey = process.env.AGENTMAIL_API_KEY;
    const agentmailInbox = process.env.AGENTMAIL_SEND_INBOX;
    if (agentmailKey && agentmailInbox && email) {
      try {
        const inboxId = encodeURIComponent(agentmailInbox);
        const chapter = [
          `Hi ${name || 'Reader'},`,
          '',
          "Here's your free chapter from The Woman Next Door Smiles Too Much (Book 1 of The Occupied Series).",
          '',
          '---',
          '',
          'CHAPTER 1',
          '',
          "She moved in on a Tuesday. I know because the moving truck blocked my driveway at 8:47 AM, and I had to wait seventeen minutes before I could back out.",
          '',
          "I watched from my kitchen window—not because I was nosy, but because the truck was literally in my way. Two men carried boxes. One woman stood on the sidewalk, directing them with small, precise hand gestures.",
          '',
          "She didn't look at my house. Not once.",
          '',
          "That was the first thing that bothered me.",
          '',
          "People always look at the neighbor's house when they move in. It's human nature. You size up the place next door. You wonder who lives there. You mentally decorate their yard.",
          '',
          "She didn't look.",
          '',
          "Not at my house. Not at Mrs. Chen's across the street. Not at the kid with the blue bike who was doing loops in the cul-de-sac.",
          '',
          "She only looked at the boxes.",
          '',
          'To be continued...',
          '',
          '---',
          '',
          'Buy the full book: https://www.amazon.com/dp/B0GZWSXXH3',
          'The Occupied Series: https://www.amazon.com/dp/B0GX2XCCR8'
        ].join('\n');
        await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/send`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${agentmailKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: [email], subject: 'Your Free Chapter from The Occupied Series', text: chapter })
        });
      } catch(e) { console.error('AgentMail error:', e); }
    }

    return res.status(200).json({ ok: true, message: 'Lead captured', name: name || 'Reader', email: email || '' });
  }

  return res.status(405).end();
}
