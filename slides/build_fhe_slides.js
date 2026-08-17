const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const W = 1600;
const H = 900;
const OUT = path.join(__dirname, "out");

const C = {
  bg: "#07111F",
  bg2: "#0B1B2B",
  panel: "#0F2236",
  panel2: "#122A42",
  line: "#294A67",
  text: "#F5F8FC",
  muted: "#9FB1C4",
  cyan: "#45D7FF",
  mint: "#91F6D2",
  yellow: "#FFD166",
  coral: "#FF8B78",
  red: "#FF6B6B",
  ink: "#06101D",
};

const FONT = "Noto Sans JP, Meiryo, Yu Gothic, Segoe UI, sans-serif";
const MONO = "Cascadia Mono, Consolas, monospace";

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function attrs(obj) {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}="${esc(value)}"`)
    .join(" ");
}

function rect(x, y, w, h, fill, rx = 24, extra = "") {
  return `<rect ${attrs({ x, y, width: w, height: h, rx, fill })} ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke = C.line, width = 2, extra = "") {
  return `<line ${attrs({ x1, y1, x2, y2, stroke, "stroke-width": width })} ${extra}/>`;
}

function text(x, y, value, options = {}) {
  const {
    size = 24,
    fill = C.text,
    weight = 500,
    anchor = "start",
    family = FONT,
    opacity = 1,
    letter = 0,
    baseline = "alphabetic",
  } = options;
  return `<text ${attrs({
    x,
    y,
    fill,
    "font-family": family,
    "font-size": size,
    "font-weight": weight,
    "text-anchor": anchor,
    opacity,
    "letter-spacing": letter,
    "dominant-baseline": baseline,
  })}>${esc(value)}</text>`;
}

function lines(x, y, values, options = {}) {
  const { gap = 34 } = options;
  return values.map((value, index) => text(x, y + index * gap, value, options)).join("");
}

function pill(x, y, label, color, options = {}) {
  const { width = Math.max(100, label.length * 17 + 42), height = 38, textColor = C.ink } = options;
  return `${rect(x, y, width, height, color, height / 2)}${text(x + width / 2, y + height / 2 + 1, label, {
    size: 16,
    fill: textColor,
    weight: 800,
    anchor: "middle",
    baseline: "middle",
    letter: 0.4,
  })}`;
}

function label(x, y, value, color = C.cyan) {
  return text(x, y, value.toUpperCase(), { size: 16, fill: color, weight: 800, letter: 2.2 });
}

function arrow(x1, y1, x2, y2, color = C.cyan, width = 4) {
  const head = 12;
  return `${line(x1, y1, x2, y2, color, width, `stroke-linecap="round"`)}<path d="M ${x2 - head} ${y2 - head / 2} L ${x2} ${y2} L ${x2 - head} ${y2 + head / 2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function lockIcon(x, y, scale = 1, color = C.cyan) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 44V28C22 12 34 2 50 2s28 10 28 26v16"/>
    <rect x="8" y="42" width="84" height="64" rx="14" fill="${C.panel2}"/>
    <circle cx="50" cy="72" r="7" fill="${color}" stroke="none"/>
    <path d="M50 79v14"/>
  </g>`;
}

function keyIcon(x, y, scale = 1, color = C.mint) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="28" cy="34" r="20"/>
    <path d="M43 49l44 44M68 74l10-10M78 84l10-10"/>
  </g>`;
}

function serverIcon(x, y, scale = 1, color = C.cyan) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="92" height="34" rx="8" fill="${C.panel2}"/>
    <rect x="4" y="48" width="92" height="34" rx="8" fill="${C.panel2}"/>
    <circle cx="20" cy="21" r="3" fill="${color}" stroke="none"/><circle cx="20" cy="65" r="3" fill="${color}" stroke="none"/>
    <path d="M34 21h42M34 65h42"/>
  </g>`;
}

function eyeSlash(x, y, scale = 1, color = C.coral) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 50s18-28 46-28 46 28 46 28-18 28-46 28S4 50 4 50Z"/>
    <circle cx="50" cy="50" r="12"/>
    <path d="M12 12l76 76"/>
  </g>`;
}

function checkIcon(x, y, color = C.mint) {
  return `<circle cx="${x}" cy="${y}" r="14" fill="${color}"/><path d="M ${x - 7} ${y} l 5 5 l 10 -12" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function crossIcon(x, y, color = C.coral) {
  return `<circle cx="${x}" cy="${y}" r="14" fill="${color}"/><path d="M ${x - 5} ${y - 5} l 10 10 M ${x + 5} ${y - 5} l -10 10" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`;
}

function grid() {
  let out = `<g opacity="0.13" stroke="${C.line}" stroke-width="1">`;
  for (let x = 0; x <= W; x += 80) out += `<path d="M${x} 0V${H}"/>`;
  for (let y = 0; y <= H; y += 80) out += `<path d="M0 ${y}H${W}"/>`;
  return `${out}</g>`;
}

function base(kicker, page, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg2}"/></linearGradient>
    <linearGradient id="cyanGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.mint}" stop-opacity="0.04"/></linearGradient>
    <linearGradient id="coralGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.coral}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.coral}" stop-opacity="0.02"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.28"/></filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="32"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${grid()}
  <circle cx="1450" cy="50" r="280" fill="${C.cyan}" opacity="0.08" filter="url(#soft)"/>
  <circle cx="100" cy="860" r="240" fill="${C.coral}" opacity="0.06" filter="url(#soft)"/>
  ${text(96, 58, "HEIR  ×  OpenFHE", { size: 18, fill: C.muted, weight: 800, letter: 2.5 })}
  ${text(1504, 58, page, { size: 18, fill: C.muted, weight: 700, anchor: "end", family: MONO, letter: 1.5 })}
  ${label(96, 112, kicker)}
  ${body}
  ${line(96, 846, 1504, 846, C.line, 1)}
  ${text(96, 875, "CONFIDENTIAL INFERENCE / DOCKER COMPOSE EXPERIMENT", { size: 14, fill: C.muted, weight: 700, letter: 1.5 })}
  ${text(1504, 875, "Apple-inspired · 2026", { size: 14, fill: C.muted, weight: 600, anchor: "end" })}
  </svg>`;
}

function writeSlide(index, svg) {
  fs.mkdirSync(OUT, { recursive: true });
  const name = `${String(index).padStart(2, "0")}`;
  const svgPath = path.join(OUT, `${name}.svg`);
  const pngPath = path.join(OUT, `${name}.png`);
  const normalizedSvg = `${svg.replace(/^[ \t]+$/gm, "").trim()}\n`;
  fs.writeFileSync(svgPath, normalizedSvg, "utf8");
  const png = new Resvg(normalizedSvg, { fitTo: { mode: "width", value: 1600 } }).render().asPng();
  fs.writeFileSync(pngPath, png);
}

function slide1() {
  const body = `
    ${text(96, 238, "機密データを、", { size: 72, weight: 800, letter: -1.5 })}
    ${text(96, 322, "見せずに判定する。", { size: 72, weight: 800, fill: C.cyan, letter: -1.5 })}
    ${text(100, 382, "FHEが効くのは、計算そのものよりも", { size: 28, fill: C.muted, weight: 500 })}
    ${text(100, 424, "「データを預ける相手に、元データを見せたくない」場面。", { size: 28, fill: C.text, weight: 650 })}
    ${rect(96, 524, 600, 142, C.panel, 28, 'filter="url(#shadow)"')}
    ${pill(126, 550, "PRIVATE INPUT", C.cyan, { width: 168 })}
    ${text(126, 614, "¥75,000 · 12回 · 180 km · 新端末", { size: 25, weight: 700 })}
    ${text(126, 650, "決済プラットフォームだけが知っている", { size: 18, fill: C.muted, weight: 500 })}
    ${lockIcon(818, 516, 1.05, C.cyan)}
    ${arrow(940, 568, 1088, 568, C.cyan, 5)}
    ${rect(1120, 510, 368, 176, C.panel, 28, 'filter="url(#shadow)"')}
    ${serverIcon(1150, 545, 1.1, C.mint)}
    ${text(1300, 558, "外部モデルサービス", { size: 22, weight: 750 })}
    ${text(1300, 600, "eval(ciphertexts)", { size: 20, fill: C.mint, weight: 700, family: MONO })}
    ${text(1300, 644, "値ではなく、暗号文を計算する", { size: 16, fill: C.muted, weight: 500 })}
    ${pill(1120, 716, "SCORE 822  →  MANUAL REVIEW", C.yellow, { width: 368, height: 48 })}
  `;
  return base("THE WHY", "01 / 05", body);
}

function slide2() {
  const body = `
    ${text(96, 190, "普通のクラウド推論では、", { size: 54, weight: 800 })}
    ${text(96, 256, "機密データが見えてしまう。", { size: 54, weight: 800, fill: C.coral })}
    ${rect(96, 338, 650, 392, C.panel, 30, 'filter="url(#shadow)"')}
    ${pill(132, 372, "BEFORE / PLAINTEXT", C.coral, { width: 236 })}
    ${text(132, 438, "決済プラットフォーム", { size: 25, weight: 750 })}
    ${arrow(330, 478, 510, 478, C.coral, 5)}
    ${serverIcon(560, 436, 1.05, C.coral)}
    ${text(630, 560, "外部サービスから", { size: 20, fill: C.coral, weight: 700, anchor: "middle" })}
    ${text(630, 594, "明細が見える", { size: 28, fill: C.text, weight: 800, anchor: "middle" })}
    ${eyeSlash(532, 612, 0.75, C.coral)}
    ${text(132, 660, "金額 / 回数 / 位置 / 端末 / 加盟店", { size: 19, fill: C.muted, weight: 550 })}
    ${rect(854, 338, 650, 392, C.panel, 30, 'filter="url(#shadow)"')}
    ${pill(890, 372, "AFTER / FHE", C.cyan, { width: 164 })}
    ${text(890, 438, "決済プラットフォーム", { size: 25, weight: 750 })}
    ${lockIcon(1090, 426, 0.8, C.cyan)}
    ${arrow(1195, 478, 1324, 478, C.cyan, 5)}
    ${serverIcon(1360, 436, 1.05, C.mint)}
    ${text(1178, 560, "外部サービスが見るのは", { size: 20, fill: C.mint, weight: 700, anchor: "middle" })}
    ${text(1178, 594, "暗号文だけ", { size: 28, fill: C.text, weight: 800, anchor: "middle" })}
    ${text(890, 660, "計算結果を返す。復号と判断は手元で行う。", { size: 19, fill: C.muted, weight: 550 })}
    ${line(746, 370, 746, 698, C.line, 2, 'stroke-dasharray="6 12"')}
    ${text(800, 792, "FHE = Fully Homomorphic Encryption", { size: 21, fill: C.text, weight: 700, anchor: "middle" })}
    ${text(800, 824, "暗号文のまま、足し算・掛け算・推論を行う。", { size: 19, fill: C.muted, weight: 500, anchor: "middle" })}
  `;
  return base("THE PROBLEM", "02 / 05", body);
}

function slide3() {
  const body = `
    ${text(96, 190, "この実験で起きていること", { size: 54, weight: 800 })}
    ${text(96, 244, "見えるのは「境界」と「結果」だけ。", { size: 25, fill: C.muted, weight: 550 })}
    ${pill(96, 304, "PLAINTEXT", C.yellow, { width: 145 })}
    ${pill(1135, 304, "CIPHERTEXT", C.cyan, { width: 160 })}
    ${text(1310, 330, "だけが外部へ", { size: 18, fill: C.muted, weight: 600 })}
    ${rect(96, 388, 286, 268, C.panel, 26, 'filter="url(#shadow)"')}
    ${text(128, 430, "01", { size: 16, fill: C.cyan, weight: 800, family: MONO })}
    ${text(128, 480, "決済側", { size: 28, weight: 800 })}
    ${text(128, 518, "機密な特徴量", { size: 20, fill: C.text, weight: 650 })}
    ${lines(128, 568, ["¥75,000", "12回 / 24h", "新端末 = 1"], { size: 18, fill: C.muted, weight: 550, gap: 28 })}
    ${arrow(400, 522, 498, 522, C.cyan, 4)}
    ${rect(516, 388, 250, 268, C.panel, 26, 'filter="url(#shadow)"')}
    ${text(548, 430, "02", { size: 16, fill: C.cyan, weight: 800, family: MONO })}
    ${lockIcon(585, 460, 0.66, C.cyan)}
    ${text(641, 582, "encrypt", { size: 22, fill: C.cyan, weight: 800, family: MONO, anchor: "middle" })}
    ${text(641, 620, "HEIR + OpenFHE", { size: 16, fill: C.muted, weight: 650, anchor: "middle" })}
    ${arrow(784, 522, 882, 522, C.cyan, 4)}
    ${rect(900, 388, 300, 268, C.panel, 26, 'filter="url(#shadow)"')}
    ${text(932, 430, "03", { size: 16, fill: C.cyan, weight: 800, family: MONO })}
    ${serverIcon(946, 462, 0.8, C.mint)}
    ${text(1050, 572, "外部モデル", { size: 25, weight: 800, anchor: "middle" })}
    ${text(1050, 612, "eval(ciphertexts)", { size: 17, fill: C.mint, weight: 700, family: MONO, anchor: "middle" })}
    ${arrow(1218, 522, 1316, 522, C.cyan, 4)}
    ${rect(1334, 388, 170, 268, C.panel, 26, 'filter="url(#shadow)"')}
    ${text(1366, 430, "04", { size: 16, fill: C.cyan, weight: 800, family: MONO })}
    ${keyIcon(1384, 462, 0.6, C.mint)}
    ${text(1419, 572, "decrypt", { size: 19, fill: C.mint, weight: 800, family: MONO, anchor: "middle" })}
    ${text(1419, 612, "手元で判定", { size: 17, fill: C.text, weight: 650, anchor: "middle" })}
    ${rect(324, 726, 952, 64, "url(#cyanGlow)", 32)}
    ${text(800, 766, "外部サービスに渡るのは、5つの暗号文 + transaction_id", { size: 24, fill: C.cyan, weight: 800, anchor: "middle" })}
  `;
  return base("THE FLOW", "03 / 05", body);
}

function slide4() {
  const body = `
    ${text(96, 190, "中身は「小さな暗号化推論モデル」", { size: 52, weight: 800 })}
    ${text(96, 244, "ただの足し算ではなく、相互作用項まで暗号文上で計算する。", { size: 24, fill: C.muted, weight: 550 })}
    ${rect(96, 324, 660, 402, C.panel, 30, 'filter="url(#shadow)"')}
    ${label(132, 366, "MODEL CIRCUIT", C.cyan)}
    ${text(132, 450, "score = amount × 3", { size: 27, fill: C.text, weight: 700, family: MONO })}
    ${text(132, 492, "      + tx_count × 20", { size: 27, fill: C.text, weight: 700, family: MONO })}
    ${text(132, 534, "      + distance × 4", { size: 27, fill: C.text, weight: 700, family: MONO })}
    ${text(132, 576, "      + new_device × 120", { size: 27, fill: C.text, weight: 700, family: MONO })}
    ${text(132, 618, "      + merchant_risk × 15", { size: 27, fill: C.text, weight: 700, family: MONO })}
    ${text(132, 660, "      + amount × new_device", { size: 27, fill: C.yellow, weight: 800, family: MONO })}
    ${pill(132, 690, "interaction term", C.yellow, { width: 168, height: 32 })}
    ${rect(822, 324, 682, 402, C.panel, 30, 'filter="url(#shadow)"')}
    ${label(858, 366, "TX-002 / SAMPLE", C.mint)}
    ${text(858, 432, "機密入力（決済側）", { size: 25, weight: 800 })}
    ${lines(858, 484, ["amount       ¥75,000", "tx_count     12 / 24h", "distance     180 km", "new_device   1", "merchant     risk 6"], { size: 21, fill: C.muted, weight: 600, family: MONO, gap: 34 })}
    ${line(858, 665, 1468, 665, C.line, 2)}
    ${text(858, 705, "復号されたスコア", { size: 18, fill: C.muted, weight: 600 })}
    ${text(1128, 712, "822", { size: 48, fill: C.yellow, weight: 850, family: MONO })}
    ${pill(1282, 684, "MANUAL REVIEW", C.yellow, { width: 186, height: 42 })}
    ${text(800, 790, "平文リファレンス = 822  /  復号結果 = 822  /  PASS", { size: 22, fill: C.mint, weight: 800, anchor: "middle" })}
  `;
  return base("INSIDE THE EXPERIMENT", "04 / 05", body);
}

function slide5() {
  const body = `
    ${text(96, 190, "ここまでで、何が確認できたか", { size: 54, weight: 800 })}
    ${text(96, 244, "FHEの価値と、まだ足りない実装を切り分ける。", { size: 25, fill: C.muted, weight: 550 })}
    ${rect(96, 324, 442, 378, "url(#cyanGlow)", 30, 'filter="url(#shadow)"')}
    ${text(130, 384, "4 / 4", { size: 82, fill: C.cyan, weight: 850, family: MONO })}
    ${text(130, 438, "transactions PASS", { size: 23, fill: C.text, weight: 750 })}
    ${text(130, 510, "5", { size: 54, fill: C.mint, weight: 850, family: MONO })}
    ${text(206, 510, "features encrypted", { size: 20, fill: C.muted, weight: 600 })}
    ${text(130, 572, "1", { size: 54, fill: C.yellow, weight: 850, family: MONO })}
    ${text(206, 572, "interaction term", { size: 20, fill: C.muted, weight: 600 })}
    ${text(130, 650, "実験結果は、平文リファレンスと一致", { size: 18, fill: C.muted, weight: 550 })}
    ${rect(590, 324, 438, 378, C.panel, 30, 'filter="url(#shadow)"')}
    ${label(626, 368, "CONFIRMED", C.mint)}
    ${checkIcon(642, 432, C.mint)}
    ${text(674, 440, "入力値を暗号化して送れる", { size: 21, weight: 650 })}
    ${checkIcon(642, 502, C.mint)}
    ${text(674, 510, "外部側は暗号文を評価する", { size: 21, weight: 650 })}
    ${checkIcon(642, 572, C.mint)}
    ${text(674, 580, "手元で復号して判断できる", { size: 21, weight: 650 })}
    ${rect(1080, 324, 424, 378, C.panel, 30, 'filter="url(#shadow)"')}
    ${label(1116, 368, "STILL A DEMO", C.yellow)}
    ${crossIcon(1132, 432, C.yellow)}
    ${text(1164, 440, "単一プロセス", { size: 21, weight: 650 })}
    ${crossIcon(1132, 502, C.yellow)}
    ${text(1164, 510, "合成データ", { size: 21, weight: 650 })}
    ${crossIcon(1132, 572, C.yellow)}
    ${text(1164, 580, "鍵配送・通信は未実装", { size: 21, weight: 650 })}
    ${rect(300, 756, 1000, 58, C.panel2, 29)}
    ${text(800, 792, "NEXT  →  client と model-service を別コンテナへ", { size: 24, fill: C.cyan, weight: 800, anchor: "middle" })}
    ${text(800, 838, "Sunwood-ai-labs/heir-fhe-lab", { size: 16, fill: C.muted, weight: 600, anchor: "middle", family: MONO })}
  `;
  return base("TAKEAWAY", "05 / 05", body);
}

const slides = [slide1(), slide2(), slide3(), slide4(), slide5()];
slides.forEach((svg, index) => writeSlide(index + 1, svg));
console.log(`Rendered ${slides.length} slides to ${OUT}`);
