export function generateBrandGuidelinesPdf() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Virtu Ferries — Brand Guidelines</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Montserrat', sans-serif;
      color: #111;
      background: #fff;
      font-size: 10pt;
      line-height: 1.6;
    }

    /* ─── Page layout ─── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 20mm;
    }

    @media print {
      html, body { width: 210mm; }
      .page { padding: 14mm 18mm; page-break-after: always; }
      .no-break { page-break-inside: avoid; }
    }

    /* ─── Cover ─── */
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 260mm;
      border-bottom: 3px solid #1e82b4;
      padding-bottom: 12mm;
      margin-bottom: 0;
    }

    .cover-logo { height: 56px; object-fit: contain; }

    .cover-title {
      font-size: 36pt;
      font-weight: 800;
      color: #111;
      line-height: 1.15;
      margin-top: auto;
      padding-top: 40mm;
    }

    .cover-subtitle {
      font-size: 13pt;
      font-weight: 300;
      color: #555;
      margin-top: 8px;
    }

    .cover-meta {
      font-size: 8pt;
      color: #999;
      margin-top: 12mm;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* ─── Section headings ─── */
    .section {
      margin-top: 12mm;
      page-break-inside: avoid;
    }

    .section-label {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6mm;
    }

    .section-bar {
      width: 28px;
      height: 2px;
      border-radius: 1px;
      flex-shrink: 0;
    }

    .bar-blue  { background: #1e82b4; }
    .bar-amber { background: #f6a610; }
    .bar-red   { background: #e01814; }
    .bar-gray  { background: #ccc; }

    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #111;
    }

    /* ─── Body text ─── */
    p { margin-bottom: 6px; }
    .body-text { font-weight: 300; color: #333; }
    .body-text-sm { font-size: 9pt; font-weight: 300; color: #444; }

    /* ─── Cards ─── */
    .card {
      background: #f7f7f7;
      border-radius: 8px;
      padding: 6mm 8mm;
      margin-bottom: 4mm;
    }

    .card-title {
      font-weight: 700;
      font-size: 10pt;
      margin-bottom: 3px;
    }

    /* ─── 2-col grid ─── */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
    }

    /* ─── Colour swatches ─── */
    .swatches {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4mm;
      margin-top: 4mm;
    }

    .swatch-wrap { text-align: center; }

    .swatch {
      height: 20mm;
      border-radius: 6px;
      margin-bottom: 3px;
    }

    .swatch-name { font-size: 7.5pt; font-weight: 600; color: #111; }
    .swatch-hex  { font-size: 7pt; font-weight: 300; color: #666; font-family: monospace; }

    /* ─── Bullet list ─── */
    ul.brand-list { list-style: none; padding: 0; }
    ul.brand-list li {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 9.5pt;
      font-weight: 300;
      color: #333;
    }
    ul.brand-list li::before {
      content: '–';
      color: #1e82b4;
      font-weight: 600;
      flex-shrink: 0;
    }
    ul.brand-list.amber li::before { color: #f6a610; }
    ul.brand-list.red   li::before { color: #e01814; }

    /* ─── Key messages ─── */
    .message-item {
      border-left: 2px solid #1e82b4;
      padding: 3px 0 3px 10px;
      margin-bottom: 5px;
      font-size: 10pt;
      font-style: italic;
      color: #222;
    }

    /* ─── Typography showcase ─── */
    .type-row { margin-bottom: 4px; display: flex; align-items: baseline; gap: 10px; }
    .type-weight { font-size: 7.5pt; color: #999; width: 80px; flex-shrink: 0; }

    /* ─── Platform table ─── */
    .platform-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .platform-table th { background: #1e82b4; color: #fff; font-weight: 600; text-align: left; padding: 4px 8px; }
    .platform-table td { padding: 4px 8px; border-bottom: 1px solid #eee; font-weight: 300; }
    .platform-table tr:nth-child(even) td { background: #f9f9f9; }

    /* ─── Footer ─── */
    .footer {
      margin-top: 16mm;
      padding-top: 4mm;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #aaa;
    }
  </style>
</head>
<body>

<!-- ══════════ COVER ══════════ -->
<div class="page">
  <div class="cover">
    <img class="cover-logo" src="/logo.png" alt="Virtu Ferries" />
    <div>
      <div class="cover-title">Brand Guidelines</div>
      <div class="cover-subtitle">Voice, Identity & Visual Standards — Internal Reference</div>
      <div class="cover-meta">Virtu Ferries &nbsp;·&nbsp; Version 1.0 &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- ── Brand Story ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-blue"></div>
      <span class="section-title">Brand Story</span>
    </div>
    <div class="card">
      <p class="body-text">
        Virtu Ferries has been connecting Malta and Sicily for decades. Not just two ports — two cultures, two ways of life, two islands that have more in common than most people realise. The crossing takes 1 hour 45 minutes. What you discover on the other side stays with you longer.
      </p>
    </div>
  </div>

  <!-- ── Key Messages ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-amber"></div>
      <span class="section-title">Key Messages</span>
    </div>
    <div class="message-item">The fastest way between Malta and Sicily</div>
    <div class="message-item">Travel by foot or bring your car</div>
    <div class="message-item">A crossing worth making, not just taking</div>
    <div class="message-item">Two islands. One ferry. Endless reasons to go.</div>
  </div>
</div>

<!-- ══════════ PAGE 2: TONE ══════════ -->
<div class="page">
  <!-- ── Tone of Voice ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-blue"></div>
      <span class="section-title">Tone of Voice</span>
    </div>
    <div class="card">
      <p class="body-text">Travel-forward and editorially sharp. Warm but not gushing. Confident but not corporate.</p>
      <p class="body-text" style="margin-top:6px">Economy of language — no filler, no clichés. Feels like a well-travelled friend, not a brand account.</p>
    </div>
  </div>

  <!-- ── Do / Don't ── -->
  <div class="section grid-2">
    <div class="no-break">
      <div class="section-label">
        <div class="section-bar bar-blue"></div>
        <span class="section-title" style="font-size:11pt">Write like this</span>
      </div>
      <ul class="brand-list">
        <li>Specific place names, food, seasons, cultural moments</li>
        <li>Short, confident sentences with real rhythm</li>
        <li>Copy that earns the reader's time</li>
        <li>Platform-native language that doesn't feel scheduled</li>
      </ul>
    </div>
    <div class="no-break">
      <div class="section-label">
        <div class="section-bar bar-red"></div>
        <span class="section-title" style="font-size:11pt">Never write like this</span>
      </div>
      <ul class="brand-list red">
        <li>"Paradise", "breathtaking", "unforgettable", "hidden gem"</li>
        <li>Generic travel language that could belong to any brand</li>
        <li>Pushy CTAs that treat the audience like a conversion target</li>
        <li>Exclamation marks used for enthusiasm rather than meaning</li>
      </ul>
    </div>
  </div>

  <!-- ── Logo Usage ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-amber"></div>
      <span class="section-title">Logo Usage</span>
    </div>
    <div class="grid-2">
      <div class="card no-break">
        <div class="card-title" style="color:#1e82b4">Do ✓</div>
        <ul class="brand-list" style="margin-top:4px">
          <li>Use the full-colour version on neutral or light backgrounds</li>
          <li>Use the white reversed version on photographic or coloured backgrounds</li>
          <li>Maintain generous clear space — at least the height of the F in FERRIES</li>
          <li>Use only the supplied files — do not recreate the logo</li>
        </ul>
      </div>
      <div class="card no-break">
        <div class="card-title" style="color:#e01814">Don't ✗</div>
        <ul class="brand-list red" style="margin-top:4px">
          <li>Stretch, skew, or distort the logo in any dimension</li>
          <li>Place on busy photographic backgrounds without contrast</li>
          <li>Change any of the logo colours to unofficial values</li>
          <li>Add outlines, shadows, or effects not in the supplied files</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- ══════════ PAGE 3: VISUAL ══════════ -->
<div class="page">
  <!-- ── Colour Palette ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-amber"></div>
      <span class="section-title">Colour Palette</span>
    </div>
    <div class="swatches">
      <div class="swatch-wrap">
        <div class="swatch" style="background:#1e82b4"></div>
        <div class="swatch-name">Primary Blue</div>
        <div class="swatch-hex">#1e82b4</div>
      </div>
      <div class="swatch-wrap">
        <div class="swatch" style="background:#f6a610"></div>
        <div class="swatch-name">Secondary Amber</div>
        <div class="swatch-hex">#f6a610</div>
      </div>
      <div class="swatch-wrap">
        <div class="swatch" style="background:#e01814"></div>
        <div class="swatch-name">Accent Red</div>
        <div class="swatch-hex">#e01814</div>
      </div>
      <div class="swatch-wrap">
        <div class="swatch" style="background:#f5f5f5; border:1px solid #ddd"></div>
        <div class="swatch-name">Off White</div>
        <div class="swatch-hex">#f5f5f5</div>
      </div>
      <div class="swatch-wrap">
        <div class="swatch" style="background:#0d1b2a"></div>
        <div class="swatch-name">Deep Navy</div>
        <div class="swatch-hex">#0d1b2a</div>
      </div>
    </div>
    <p class="body-text-sm" style="margin-top:6mm">Primary Blue is the primary CTA, link, and UI colour. Amber is used for highlights and warm accents only. Accent Red is reserved for urgency states and the logo mark.</p>
  </div>

  <!-- ── Typography ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-blue"></div>
      <span class="section-title">Typography</span>
    </div>
    <div class="card">
      <div style="margin-bottom:6px"><span style="font-size:8pt;color:#1e82b4;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Primary Font</span></div>
      <div style="font-size:22pt;font-weight:800;margin-bottom:6px">Montserrat</div>
      <div class="type-row"><span class="type-weight">ExtraBold 800</span><span style="font-weight:800;font-size:13pt">Hero headings and display moments</span></div>
      <div class="type-row"><span class="type-weight">SemiBold 600</span><span style="font-weight:600;font-size:12pt">Section titles and labels</span></div>
      <div class="type-row"><span class="type-weight">Regular 400</span><span style="font-weight:400;font-size:11pt">UI elements and navigation</span></div>
      <div class="type-row"><span class="type-weight">Light 300</span><span style="font-weight:300;font-size:11pt;color:#555">Body copy and supporting text</span></div>
    </div>
  </div>

  <!-- ── Social Media ── -->
  <div class="section">
    <div class="section-label">
      <div class="section-bar bar-amber"></div>
      <span class="section-title">Social Media Channels</span>
    </div>
    <table class="platform-table">
      <thead>
        <tr>
          <th>Platform</th>
          <th>Format</th>
          <th>Cadence</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Instagram</td><td>Square & vertical, Reels</td><td>4–5× / week</td><td>Primary visual brand channel</td></tr>
        <tr><td>Facebook</td><td>Mixed, events, video</td><td>3–4× / week</td><td>Community, ticket offers, events</td></tr>
        <tr><td>LinkedIn</td><td>Articles, company news</td><td>1–2× / week</td><td>Freight, B2B, industry credibility</td></tr>
        <tr><td>TikTok</td><td>Short-form vertical video</td><td>2–3× / week</td><td>Discovery, younger audience</td></tr>
        <tr><td>X / Twitter</td><td>Short copy, threads</td><td>Daily</td><td>Real-time, service updates</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Virtu Ferries — Brand Guidelines v1.0</span>
    <span>Internal use only — do not distribute externally</span>
    <span>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
  </div>
</div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 800);
  };
}
