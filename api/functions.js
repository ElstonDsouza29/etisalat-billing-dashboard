'use strict';
const { app } = require('@azure/functions');
const graph   = require('./graph');

const json = (body, status = 200) => ({
  status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body)
});
const err = (msg, status = 500) => json({ ok: false, error: msg }, status);

// ── GET /api/health ───────────────────────────────────────
app.http('health', {
  methods: ['GET'], authLevel: 'anonymous', route: 'health',
  handler: async () => json({
    ok: true,
    sender: process.env.SENDER_EMAIL || 'elston.dsouza@pjprestaurants.com',
    masterFolder: process.env.ONEDRIVE_MASTER_FOLDER || 'Etisalat master',
    docsFolder:   process.env.ONEDRIVE_DOCS_FOLDER   || 'Etisalat documents',
    timestamp:    new Date().toISOString(),
    runtime:      'Azure Static Web Apps + Functions (Free)'
  })
});

// ── GET /api/master/sync ──────────────────────────────────
app.http('masterSync', {
  methods: ['GET'], authLevel: 'anonymous', route: 'master/sync',
  handler: async (req, ctx) => {
    try {
      const csv = await graph.readMaster();
      return json({ ok: true, csv });
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});

// ── POST /api/master/save ─────────────────────────────────
app.http('masterSave', {
  methods: ['POST'], authLevel: 'anonymous', route: 'master/save',
  handler: async (req, ctx) => {
    try {
      const b = await req.json();
      if (!b?.csv) return err('No CSV content', 400);
      await graph.saveMaster(b.csv);
      return json({ ok: true, message: 'Master saved to OneDrive' });
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});

// ── POST /api/documents/upload ────────────────────────────
app.http('docsUpload', {
  methods: ['POST'], authLevel: 'anonymous', route: 'documents/upload',
  handler: async (req, ctx) => {
    try {
      const b = await req.json();
      if (!b?.fileName || !b?.content) return err('fileName and content required', 400);
      const month = b.month || new Date().toISOString().slice(0, 7);
      const result = await graph.uploadDoc(b.fileName, b.content, month);
      return json({ ok: true, ...result });
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});

// ── GET /api/documents/list ───────────────────────────────
app.http('docsList', {
  methods: ['GET'], authLevel: 'anonymous', route: 'documents/list',
  handler: async (req, ctx) => {
    try {
      const docs = await graph.listDocs();
      return json({ ok: true, docs });
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});

// ── GET /api/documents/download?itemId= ──────────────────
app.http('docsDownload', {
  methods: ['GET'], authLevel: 'anonymous', route: 'documents/download',
  handler: async (req, ctx) => {
    try {
      const itemId = new URL(req.url).searchParams.get('itemId');
      if (!itemId) return err('itemId required', 400);
      const content = await graph.downloadDoc(itemId);
      return { status: 200, headers: { 'Content-Type': 'text/csv', 'Access-Control-Allow-Origin': '*' }, body: content };
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});

// ── POST /api/email/send ──────────────────────────────────
app.http('emailSend', {
  methods: ['POST'], authLevel: 'anonymous', route: 'email/send',
  handler: async (req, ctx) => {
    try {
      const b = await req.json();
      if (!b?.to || !b?.subject || !b?.body) return err('to, subject, body required', 400);
      await graph.sendEmail(b);
      return json({ ok: true, message: `Sent to ${b.to}` });
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});

// ── POST /api/email/batch ─────────────────────────────────
app.http('emailBatch', {
  methods: ['POST'], authLevel: 'anonymous', route: 'email/batch',
  handler: async (req, ctx) => {
    try {
      const b = await req.json();
      if (!Array.isArray(b?.emails) || !b.emails.length) return err('emails array required', 400);
      const results = [];
      for (const mail of b.emails) {
        try {
          await graph.sendEmail(mail);
          results.push({ empId: mail.empId, to: mail.to, ok: true });
        } catch (e) {
          results.push({ empId: mail.empId, to: mail.to, ok: false, error: e.message });
        }
        await new Promise(r => setTimeout(r, 250));
      }
      const sent = results.filter(r => r.ok).length;
      return json({ ok: true, sent, failed: results.length - sent, results });
    } catch (e) { ctx.error(e); return err(e.message); }
  }
});
