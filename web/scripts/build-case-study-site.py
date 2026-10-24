"""Builds the standalone case-study site (cercit.github.io/ownly-together) from the app's case-study page.
Light mode = exactly the app's case study. Dark mode = Sameer's portfolio colours (cercit.github.io/me).
Run from the repo root: python web/scripts/build-case-study-site.py web/public/case-study web/public/ownly-logo.jpg ../ownly-together-site
then commit and push in ../ownly-together-site (repo cercit/ownly-together, GitHub Pages).
"""
import re, shutil, sys
from pathlib import Path

src_dir = Path(sys.argv[1])           # web/public/case-study
logo = Path(sys.argv[2])              # web/public/ownly-logo.jpg
out = Path(sys.argv[3])               # new repo folder
out.mkdir(parents=True, exist_ok=True)
# Copy into the folder rather than delete-and-recreate it: OneDrive and preview servers can lock the folder.
(out / 'img').mkdir(exist_ok=True)
wanted = {f.name for f in (src_dir / 'img').iterdir()}
for f in (out / 'img').iterdir():
    if f.name not in wanted:
        f.unlink()
shutil.copytree(src_dir / 'img', out / 'img', dirs_exist_ok=True)
shutil.copy(logo, out / 'ownly-logo.jpg')

html = (src_dir / 'index.html').read_text(encoding='utf-8')

STYLE = r"""
:root{
  --pink:#F50062;--pink-dark:#C40054;--pink-hover:#A80047;--pink-soft:#FFE3ED;--blush:#FFF1F6;
  --page:#FFF9FC;--surface:#FFFFFF;--navy:#111D35;--muted:#576177;--line:#F0D7E2;
  --green:#16845A;--green-soft:#E5F6ED;--green-ink:#125F43;--amber:#A65D00;--amber-soft:#FFF1D9;--amber-ink:#855000;
  --on-accent:#FFFFFF;--header:rgba(255,255,255,.94);--strip:#111D35;--strip-ink:#FFFFFF;
  --glow:#FFD3E3;--hero-end:#FFF1F6;--shadow:0 10px 30px rgba(17,29,53,.06);--shadow-strong:0 10px 30px rgba(17,29,53,.08);
  --chip-bg:#FFE3ED;--chip-ink:#C40054;--btn-shadow:0 9px 24px rgba(196,0,84,.18);
  color-scheme:light;
}
/* Dark mode: the colours of cercit.github.io/me (near-black canvas, dark cards, amber accent) */
:root[data-theme="dark"]{
  --pink:#f5a623;--pink-dark:#f5a623;--pink-hover:#ffbb4a;--pink-soft:#2a2214;--blush:#191b25;
  --page:#0a0a0f;--surface:#13141c;--navy:#f1f2f5;--muted:#b1b4c1;--line:#30323e;
  --green:#5fd39d;--green-soft:#11251c;--green-ink:#8fe6bd;--amber:#f5a623;--amber-soft:#241c0f;--amber-ink:#f7c46b;
  --on-accent:#0a0a0f;--header:rgba(10,10,15,.92);--strip:#13141c;--strip-ink:#f1f2f5;
  --glow:#2a2214;--hero-end:#0a0a0f;--shadow:0 20px 50px #0004;--shadow-strong:0 20px 50px #0006;
  --chip-bg:#2a2214;--chip-ink:#f5a623;--btn-shadow:none;
  color-scheme:dark;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --pink:#f5a623;--pink-dark:#f5a623;--pink-hover:#ffbb4a;--pink-soft:#2a2214;--blush:#191b25;
    --page:#0a0a0f;--surface:#13141c;--navy:#f1f2f5;--muted:#b1b4c1;--line:#30323e;
    --green:#5fd39d;--green-soft:#11251c;--green-ink:#8fe6bd;--amber:#f5a623;--amber-soft:#241c0f;--amber-ink:#f7c46b;
    --on-accent:#0a0a0f;--header:rgba(10,10,15,.92);--strip:#13141c;--strip-ink:#f1f2f5;
    --glow:#2a2214;--hero-end:#0a0a0f;--shadow:0 20px 50px #0004;--shadow-strong:0 20px 50px #0006;
    --chip-bg:#2a2214;--chip-ink:#f5a623;--btn-shadow:none;
    color-scheme:dark;
  }
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--page);color:var(--navy);font:16px/1.6 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:"Plus Jakarta Sans",Inter,sans-serif;line-height:1.15;letter-spacing:-.02em;margin:0;text-wrap:balance}
a{color:var(--pink-dark)}
a:focus-visible,button:focus-visible{outline:3px solid var(--pink-dark);outline-offset:3px;border-radius:8px}
.strip{background:var(--strip);color:var(--strip-ink);text-align:center;font-size:12px;font-weight:600;padding:6px 16px}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
header.top{position:sticky;top:0;z-index:20;background:var(--header);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--navy)}
.brand img{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);object-fit:cover}
.brand b{font-family:"Plus Jakarta Sans";font-weight:800;font-size:18px;white-space:nowrap}.brand b span{color:var(--pink-dark)}
.pill{white-space:nowrap;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;font-weight:700;font-size:15px;text-decoration:none;border:1.5px solid var(--line);background:var(--surface);color:var(--navy);cursor:pointer;font-family:inherit}
.pill:hover{background:var(--blush);border-color:var(--pink-dark)}
.pill.primary{background:var(--pink-dark);border-color:var(--pink-dark);color:var(--on-accent);box-shadow:var(--btn-shadow)}
.pill.primary:hover{background:var(--pink-hover);border-color:var(--pink-hover)}
.theme-toggle{width:44px;padding:0;justify-content:center;font-size:18px}
.hero{background:radial-gradient(circle at 85% 20%,var(--glow) 0,transparent 40%),linear-gradient(160deg,var(--surface),var(--hero-end));border-bottom:1px solid var(--line)}
.hero .wrap{padding:64px 20px 56px;display:grid;gap:40px;grid-template-columns:1.1fr .9fr;align-items:center}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--pink-dark)}
.hero h1{font-size:clamp(36px,5.4vw,60px);font-weight:800;margin:12px 0 16px}
.hero h1 em{font-style:normal;color:var(--pink)}
.hero p.lede{font-size:19px;color:var(--muted);max-width:56ch;margin:0 0 24px}
.cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.hero figure{margin:0}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:32px}
.fact{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px 16px}
.fact b{display:block;font-family:"Plus Jakarta Sans";font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}
.fact span{font-size:13px;color:var(--muted)}
nav.journey{border-bottom:1px solid var(--line);background:var(--surface);overflow-x:auto}
nav.journey ol{list-style:none;margin:0 auto;padding:12px 20px;display:flex;gap:8px;max-width:1120px;white-space:nowrap}
nav.journey a{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;text-decoration:none;color:var(--muted);font-weight:600;font-size:14px;border:1px solid transparent}
nav.journey a:hover{background:var(--blush);color:var(--navy);border-color:var(--line)}
nav.journey .n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--pink-soft);color:var(--pink-dark);font-size:12px;font-weight:800}
section.step{padding:72px 0;border-bottom:1px solid var(--line);scroll-margin-top:64px}
section.step:nth-of-type(even){background:var(--surface)}
.head{display:flex;align-items:baseline;gap:14px;margin-bottom:8px}
.head .n{font-family:"Plus Jakarta Sans";font-weight:800;color:var(--pink);font-size:15px;font-variant-numeric:tabular-nums}
.step h2{font-size:clamp(28px,3.6vw,40px);font-weight:800}
.q{color:var(--muted);font-size:18px;margin:6px 0 28px;max-width:62ch}
.two{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start}
.two.flip>:first-child{order:2}
.prose p{margin:0 0 14px;max-width:62ch}
.prose ul{margin:0 0 14px;padding-left:20px}.prose li{margin:6px 0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:var(--shadow)}
.shot{display:block;padding:0;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--surface);cursor:zoom-in;width:100%;box-shadow:var(--shadow-strong)}
.shot img{display:block;width:100%;height:auto}
figcaption{font-size:13px;color:var(--muted);margin-top:8px}
figure{margin:0}
table{width:100%;border-collapse:collapse;font-size:15px;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
td.r,th.r{text-align:right}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
.note{font-size:14px;background:var(--amber-soft);color:var(--amber-ink);border-radius:14px;padding:10px 14px;margin-top:14px}
.ok{font-size:14px;background:var(--green-soft);color:var(--green-ink);border-radius:14px;padding:10px 14px;margin-top:14px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chip{font-size:13px;font-weight:600;background:var(--chip-bg);color:var(--chip-ink);border-radius:999px;padding:4px 12px}
.phones{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.phones .shot{aspect-ratio:9/16;border-radius:24px}
.phones .shot img{height:100%;object-fit:cover;object-position:top}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.rules{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.rule{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px}
.rule b{display:block;font-family:"Plus Jakarta Sans";font-size:17px;margin-bottom:4px}
.rule span{font-size:14px;color:var(--muted)}
.fix{display:grid;gap:12px}
.fix div{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.fix b{display:block}
.fix span{font-size:14px;color:var(--muted)}
.tools{display:flex;flex-wrap:wrap;gap:10px}
.tool{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 14px;font-size:14px}
.tool b{display:block;font-size:15px}
footer{padding:48px 0 64px;text-align:center;color:var(--muted);font-size:14px}
footer .cta{justify-content:center;margin-bottom:18px}
dialog{border:0;padding:0;background:transparent;max-width:min(96vw,1400px);max-height:94vh}
dialog::backdrop{background:rgba(10,10,15,.85)}
dialog img{display:block;max-width:100%;max-height:88vh;border-radius:12px;background:#fff}
dialog p{color:#fff;text-align:center;font-size:14px;margin:8px 0 0}
dialog button{position:fixed;top:14px;right:14px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#111D35;font-size:22px;cursor:pointer}
@media (max-width:900px){
  .hero .wrap,.two,.grid2{grid-template-columns:1fr}
  .two.flip>:first-child{order:0}
  .facts{grid-template-columns:repeat(2,1fr)}
  .rules{grid-template-columns:1fr 1fr}
  .phones{grid-template-columns:repeat(2,1fr)}
  section.step{padding:52px 0}
}
@media (max-width:520px){.rules{grid-template-columns:1fr}header.top .pill:not(.primary):not(.theme-toggle){display:none}header.top .pill{min-height:40px;padding:0 14px;font-size:14px}.theme-toggle{width:40px;padding:0}.brand b{font-size:16px}.brand img{width:32px;height:32px}}
"""

html = re.sub(r'<style>.*?</style>', lambda m: '<style>' + STYLE + '</style>', html, count=1, flags=re.S)  # first block only; the nav block stays

# Same theme key as cercit.github.io/me, so a reader's light/dark choice carries across both sites.
THEME_BOOT = ('<script>try{var t=localStorage.getItem("sameer-portfolio-theme");if(t==="light"||t==="dark")'
              'document.documentElement.dataset.theme=t}catch(e){}</script>\n')
html = html.replace('<link rel="icon" href="../ownly-logo.jpg">', '<link rel="icon" href="ownly-logo.jpg">\n' + THEME_BOOT)

APP = 'https://ownly-together.vercel.app/'
html = html.replace('src="../ownly-logo.jpg"', 'src="ownly-logo.jpg"')
html = html.replace('<a class="brand" href="../">', '<a class="brand" href="./">')
html = html.replace('href="../"', f'href="{APP}"')
assert '../' not in html, 'a relative link to the app is left'

TOGGLE = ('<button class="pill theme-toggle" type="button" id="theme" aria-label="Switch to dark mode" title="Light or dark">'
          '<span aria-hidden="true">◐</span></button>')
html = html.replace('<div class="cta"><a class="pill" href="https://github.com/cercit/ownly.food">Code on GitHub</a>',
                    '<div class="cta">' + TOGGLE + '<a class="pill" href="https://github.com/cercit/ownly.food">Code on GitHub</a>', 1)
TOGGLE_JS = """
  const root = document.documentElement, btn = document.getElementById('theme');
  const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const label = () => btn.setAttribute('aria-label', dark() ? 'Switch to light mode' : 'Switch to dark mode');
  label();
  btn.addEventListener('click', () => {
    const next = dark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('sameer-portfolio-theme', next); } catch (e) {}
    label();
  });
"""
html = html.replace("  v.addEventListener('click', e => { if (e.target === v) v.close(); });",
                    "  v.addEventListener('click', e => { if (e.target === v) v.close(); });" + TOGGLE_JS)
(out / 'index.html').write_text(html, encoding='utf-8')
print('built', out / 'index.html', len(html), 'chars')
