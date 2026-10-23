// Rule audit: scans web/src (and index.html) for words and values the product rules forbid.
// Run: npm run audit. Exit code 1 when anything is found.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, '..');
const repo = path.join(web, '..');

const walk = d => readdirSync(d).flatMap(f => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = [...walk(path.join(web, 'src')), path.join(web, 'index.html')];

const banned = [
  ['markup', /mark-?up/i],
  ['₹0 fees', /₹\s?0\b(?!\.\d*[1-9])\s*(fee|delivery|charge)/i],
  ['you saved / savings', /you saved|saved ₹|\bsavings?\b|you save\b/i],
  ['absorbed fees', /absorb/i],
  ['capacity gauge', /capacity|\bgauge\b/i],
  ['6-person or ₹2,000 limit', /₹\s?2,?000|\b2,000\b|\b(6|six)[- ](people|persons?|members|riders)\b/i],
  ['rider names / plates / call button', /\brider\b|number plate|licen[cs]e plate|\bcall\b|tel:/i],
  ['made-up product names', /Rapido Direct|Express Saver|\bPod\b|Rapido Courier/i],
  ['commute / co-riders', /commute|co-?rider/i],
  ['company identifiers', /\bCIN\b|GSTIN|Pvt\.?\s*Ltd|Private Limited/i],
  ['price comparison', /\bcompar(e|ison)|cheaper than|vs\.? (swiggy|zomato)/i],
  ['made-up statistics', />\s*\d+(\.\d+)?\s?%|\d+% (of|off|faster|more)|\b\d+\+? (happy|users|customers)|rating|prep_time|\bmins? delivery\b/i],
  ['other-city places', /hyderabad|bengaluru|bangalore|koramangala|\bHSR\b|\bBTM\b|gachibowli/i],
  ['gemini / server', /gemini|genai|express\(|dotenv|process\.env/i],
  ['browser storage', /localStorage|sessionStorage|indexedDB/],
  ['dashed room code', /\b[A-Z0-9]{3}-[A-Z0-9]{3}\b/],
];

// restaurant names: none may be hard-coded (all come from Supabase)
const csv = readFileSync(path.join(repo, 'db/chennai/restaurants.csv'), 'utf8').split('\n').slice(1).filter(Boolean);
const names = csv.map(l => l.split(',')[0].trim()).filter(Boolean);
const baseNames = [...new Set(names.flatMap(n => [n, n.split(' - ')[0]]))];
const oldMock = ['Anjappar Chettinad', 'Buhari', 'Eating Circles', 'Junior Kuppanna', 'Thalappakatti'];
const nameChecks = [...baseNames, ...oldMock].map(n => [`restaurant name "${n}"`, new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')]);

// the only key allowed is the Supabase anon key
const anon = readFileSync(path.join(repo, 'app/ownly-api.js'), 'utf8').match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)[0];
const keyChecks = [
  ['AI/API key pattern', /AIza[\w-]{20,}|sk-[A-Za-z0-9]{20,}|GEMINI|service_role/i],
];

let hits = 0;
for (const f of files) {
  const rel = path.relative(web, f);
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const isComment = /^\s*(\/\/|\/\*|\*)/.test(line);   // comments are not shown to anyone
    for (const [label, re] of [...(isComment ? [] : banned), ...nameChecks, ...keyChecks]) {
      if (re.test(line)) { hits++; console.log(`HIT  ${rel}:${i + 1}  [${label}]  ${line.trim().slice(0, 120)}`); }
    }
    for (const m of line.matchAll(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g)) {
      if (m[0] !== anon) { hits++; console.log(`HIT  ${rel}:${i + 1}  [JWT that is not the anon key]`); }
      else if (JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url')).role !== 'anon') { hits++; console.log(`HIT  ${rel}:${i + 1}  [JWT role is not anon]`); }
    }
  });
}
console.log(hits ? `\nAudit FAILED: ${hits} hit(s)` : `Audit passed: ${files.length} files, 0 hits`);
process.exit(hits ? 1 : 0);
