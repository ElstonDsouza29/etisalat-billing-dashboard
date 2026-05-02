'use strict';
const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');

const msalConfig = {
  auth: {
    clientId:     process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    authority:    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
  }
};
const cca = new ConfidentialClientApplication(msalConfig);

async function getToken() {
  const r = await cca.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
  return r.accessToken;
}

async function gc(method, url, data, xh) {
  const token = await getToken();
  const res = await axios({
    method,
    url: url.startsWith('https') ? url : `https://graph.microsoft.com/v1.0${url}`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...xh },
    data,
    validateStatus: s => s < 500
  });
  if (res.status >= 400) throw new Error(`Graph ${res.status}: ${res.data?.error?.message || JSON.stringify(res.data)}`);
  return res.data;
}

const SENDER = () => process.env.SENDER_EMAIL || 'elston.dsouza@pjprestaurants.com';
const MF     = () => process.env.ONEDRIVE_MASTER_FOLDER || 'Etisalat master';
const DF     = () => process.env.ONEDRIVE_DOCS_FOLDER   || 'Etisalat documents';
const MFN    = () => process.env.MASTER_FILE_NAME        || 'etisalat_master.csv';

let _did = null;
async function driveId() {
  if (_did) return _did;
  const d = await gc('GET', `/users/${SENDER()}/drive`);
  _did = d.id;
  return _did;
}

async function ensureFolder(path) {
  const did = await driveId();
  let pid = 'root';
  for (const part of path.split('/').filter(Boolean)) {
    const res = await gc('GET', `/drives/${did}/items/${pid}/children?$filter=name eq '${encodeURIComponent(part)}'`);
    const item = (res.value || []).find(i => i.name === part && i.folder);
    pid = item ? item.id : (await gc('POST', `/drives/${did}/items/${pid}/children`, { name: part, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })).id;
  }
  return pid;
}

async function readMaster() {
  const did = await driveId();
  const meta = await gc('GET', `/drives/${did}/root:/${MF()}/${MFN()}`);
  const url = meta['@microsoft.graph.downloadUrl'];
  if (!url) throw new Error('Master file not found');
  const r = await axios({ method: 'GET', url, responseType: 'text' });
  return r.data;
}

async function saveMaster(csv) {
  const did = await driveId();
  await ensureFolder(MF());
  await axios({
    method: 'PUT',
    url: `https://graph.microsoft.com/v1.0/drives/${did}/root:/${MF()}/${MFN()}:/content`,
    headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'text/csv' },
    data: csv
  });
  return true;
}

async function uploadDoc(name, content, month) {
  const did = await driveId();
  await ensureFolder(`${DF()}/${month}`);
  const r = await axios({
    method: 'PUT',
    url: `https://graph.microsoft.com/v1.0/drives/${did}/root:/${DF()}/${month}/${name}:/content`,
    headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'text/csv' },
    data: content
  });
  return { name, month, webUrl: r.data?.webUrl, itemId: r.data?.id };
}

async function listDocs() {
  const did = await driveId();
  const docs = [];
  try {
    const fr = await gc('GET', `/drives/${did}/root:/${DF()}:/children?$select=id,name,folder,lastModifiedDateTime`);
    for (const folder of (fr.value || []).filter(i => i.folder)) {
      const files = await gc('GET', `/drives/${did}/items/${folder.id}/children?$select=id,name,size,lastModifiedDateTime,webUrl`);
      for (const f of (files.value || []).filter(f => !f.folder))
        docs.push({ itemId: f.id, name: f.name, month: folder.name, size: f.size, uploaded: f.lastModifiedDateTime, webUrl: f.webUrl });
    }
  } catch {}
  return docs;
}

async function downloadDoc(itemId) {
  const did = await driveId();
  const meta = await gc('GET', `/drives/${did}/items/${itemId}`);
  const r = await axios({ method: 'GET', url: meta['@microsoft.graph.downloadUrl'], responseType: 'text' });
  return r.data;
}

async function sendEmail({ to, subject, body, cc }) {
  const msg = { subject, body: { contentType: 'Text', content: body }, toRecipients: [{ emailAddress: { address: to } }] };
  if (cc) msg.ccRecipients = [{ emailAddress: { address: cc } }];
  await gc('POST', `/users/${SENDER()}/sendMail`, { message: msg, saveToSentItems: true });
  return true;
}

module.exports = { readMaster, saveMaster, uploadDoc, listDocs, downloadDoc, sendEmail };
