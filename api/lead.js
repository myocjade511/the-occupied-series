export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { name, email } = req.body || {};

    const agentmailKey = process.env.AGENTMAIL_API_KEY;
    const agentmailInbox = process.env.AGENTMAIL_SEND_INBOX;

    if (agentmailKey && agentmailInbox && email) {
      try {
        const inboxId = encodeURIComponent(agentmailInbox);
        const chapter = `Hi ${name || 'Reader'},

Here's your free chapter from The Woman Next Door Smiles Too Much (Book 1 of The Occupied Series).

---

CHAPTER 1

She moved in on a Tuesday. I know because the moving truck blocked my driveway at 8:47 AM, and I had to wait seventeen minutes before I could back out.

I watched from my kitchen window—not because I was nosy, but because the truck was literally in my way. Two men carried boxes. One woman stood on the sidewalk, directing them with small, precise hand gestures.

She didn't look at my house. Not once.

That was the first thing that bothered me.

People always look at the neighbor's house when they move in. It's human nature. You size up the place next door. You wonder who lives there. You mentally decorate their yard.

She didn't look.

Not at my house. Not at Mrs. Chen's across the street. Not at the kid with the blue bike who was doing loops in the cul-de-sac.

She only looked at the boxes.

To be continued...

---

Buy the full book: https://www.amazon.com/dp/B0GZWSXXH3
The Occupied Series: https://www.amazon.com/dp/B0GX2XCCR8`;

        await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agentmailKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: [email],
            subject: 'Your Free Chapter from The Occupied Series',
            text: chapter
          })
        });
      } catch (e) {
        // Email sending failed silently — page still shows chapter inline
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Lead captured',
      name: name || 'Reader',
      email: email || ''
    });
  }

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="occupied-leads.csv"');
    return res.status(200).send('Name,Email,Source,Timestamp\n');
  }

  return res.status(405).end();
}
