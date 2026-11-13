// =========================
// 내 수학 실험실 — 홈페이지 동작
// 이 파일은 고치지 않아도 됩니다.
// 홈페이지 이름과 앱 목록은 site-config.js에서 관리합니다.
// =========================

/* ---------- site-config.js 문구 적용 ---------- */

function applySiteConfig() {
  if (typeof SITE === "undefined") return;
  document.querySelectorAll("[data-site]").forEach(el => {
    const value = SITE[el.dataset.site];
    if (value) el.textContent = value;
  });
  document.title = SITE.name;
  const search = document.querySelector("#searchInput");
  if (search && SITE.searchPlaceholder) search.placeholder = SITE.searchPlaceholder;
}

const TINTS = ["#d9f24f", "#bfe0ff", "#ffd0c4", "#cfe9d8", "#e0d6ff", "#ffe9a8"];

const els = {
  grid: document.querySelector("#toolsGrid"),
  search: document.querySelector("#searchInput"),
  reset: document.querySelector("#resetBtn"),
  groups: document.querySelector("#subjectGroups"),
  count: document.querySelector("#toolCount"),
  filteredCount: document.querySelector("#filteredCount"),
  subjectCount: document.querySelector("#subjectCount"),
  empty: document.querySelector("#emptyMessage"),
  modal: document.querySelector("#qrModal"),
  qrTitle: document.querySelector("#qrTitle"),
  qrCode: document.querySelector("#qrCode"),
  qrUrl: document.querySelector("#qrUrl"),
  copyBtn: document.querySelector("#copyUrlBtn")
};

let selectedSubject = "전체";
let currentQrUrl = "";

/* ---------- 과목 필터 ---------- */

function initializeSubjects() {
  const rows = [
    { label: "전체", items: ["전체"] },
    ...SUBJECT_GROUPS
  ];

  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "subject-row";

    const label = document.createElement("span");
    label.className = "row-label";
    label.textContent = row.label;

    const chips = document.createElement("div");
    chips.className = "row-chips";
    for (const subject of row.items) chips.appendChild(createSubjectChip(subject));

    rowEl.append(label, chips);
    els.groups.appendChild(rowEl);
  }

  els.subjectCount.textContent = SUBJECT_GROUPS.flatMap(g => g.items).length;
}

function createSubjectChip(subject) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "subject-chip";
  button.dataset.subject = subject;
  button.innerHTML = `${escapeHtml(subject)}<span class="chip-count">0</span>`;
  button.addEventListener("click", () => setSubject(subject));
  return button;
}

function setSubject(subject) {
  selectedSubject = subject;
  renderTools();
}

// 학생 작품을 만든 학생의 학번으로 찾기.
// "10406", "104"(1학년 4반), "4반 6번", "1학년 4반", "1-4-6" 같은 검색어를 알아듣는다.
function makerMatches(tool, query) {
  if (!tool.maker) return false;
  const m = String(tool.maker), grade = +m[0], cls = +m.slice(1, 3), no = +m.slice(3);
  const q = query.replace(/\s+/g, "");
  if (/^\d{2,5}$/.test(q)) return m.startsWith(q);
  const dash = q.match(/^(\d)[-./](\d{1,2})(?:[-./](\d{1,2}))?$/);
  if (dash) return +dash[1] === grade && +dash[2] === cls && (dash[3] == null || +dash[3] === no);
  const g = q.match(/(\d)학년/), c = q.match(/(\d{1,2})반/), n = q.match(/(\d{1,2})번/);
  if (!g && !c && !n) return false;
  if (q.replace(/\d학년|\d{1,2}반|\d{1,2}번/g, "") !== "") return false;
  return (!g || +g[1] === grade) && (!c || +c[1] === cls) && (!n || +n[1] === no);
}

function matchesQuery(tool, query) {
  if (!query) return true;
  if (makerMatches(tool, query)) return true;

  // 띄어 쓴 낱말은 모두 들어 있어야 한다
  const text = [tool.title, tool.subject, tool.description, tool.maker || "", ...tool.tags].join(" ").toLowerCase();
  return query.split(/\s+/).filter(Boolean).every(word => text.includes(word));
}

function updateChips(query) {
  const byQuery = TOOLS.filter(tool => matchesQuery(tool, query));

  document.querySelectorAll(".subject-chip").forEach(chip => {
    const subject = chip.dataset.subject;
    const count = subject === "전체"
      ? byQuery.length
      : byQuery.filter(tool => tool.subject === subject).length;

    chip.querySelector(".chip-count").textContent = count;
    chip.classList.toggle("has-items", count > 0);
    chip.classList.toggle("active", subject === selectedSubject);
  });
}
/* ---------- 썸네일 자동 매칭 ---------- */

function toolFolderName(tool) {
  return tool.url
    .replace(/^\.?\//, "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .pop();
}

function setupAutoThumbnail(card, tool) {
  const img = card.querySelector(".card-thumb");
  const placeholder = card.querySelector(".media-placeholder");

  const folder = toolFolderName(tool);
  const extensions = ["jpg", "png", "jpeg", "webp"];
  let index = 0;

  function tryNext() {
    if (index >= extensions.length) {
      img.style.display = "none";
      placeholder.style.display = "";
      return;
    }

    img.src = `./thumbnails/${folder}.${extensions[index++]}`;
  }

  img.addEventListener("load", () => {
    img.style.display = "block";
    placeholder.style.display = "none";
  });

  img.addEventListener("error", tryNext);

  tryNext();
}

/* ---------- 카드 ---------- */

function renderTools() {
  const query = els.search.value.trim().toLowerCase();
  const tools = TOOLS.filter(tool =>
    (selectedSubject === "전체" || tool.subject === selectedSubject) &&
    matchesQuery(tool, query)
  );

  updateChips(query);

  els.grid.innerHTML = "";
  els.filteredCount.textContent = tools.length;
  els.empty.hidden = tools.length > 0;

  tools.forEach((tool, index) => {
    const card = document.createElement("article");
    card.className = "tool-card";
    card.style.setProperty("--card-tint", TINTS[index % TINTS.length]);

    card.innerHTML = `
      <div class="card-media">
  <img
    class="card-thumb"
    alt="${escapeHtml(tool.title)} 썸네일"
    style="position:absolute; inset:0; width:100%; height:100%;
           object-fit:cover; display:none; z-index:0;"
  >

  <span class="card-num" style="z-index:2">
    ${String(index + 1).padStart(2, "0")}
  </span>

  <div class="media-placeholder"
       style="position:relative; z-index:1;
              display:grid; place-items:center; gap:10px;">

    <svg viewBox="0 0 24 24" width="30" height="30" fill="none"
         stroke="rgba(21,23,26,.62)" stroke-width="1.6"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5"></rect>
      <circle cx="8.6" cy="9.6" r="1.5"></circle>
      <path d="M4 17l4.8-4.6 3.4 3.2 3-2.6L20 17"></path>
    </svg>

    <span class="media-label">
      ${escapeHtml(tool.title)} 화면 캡처
    </span>
  </div>
</div>
      <div class="card-body">
        <div class="label-row">
          <span class="subject-label">${escapeHtml(tool.subject)}</span>
          ${tool.maker ? `<span class="subject-label maker-label">만든 학생 ${escapeHtml(String(tool.maker))}</span>` : ""}
        </div>
        <h3>${escapeHtml(tool.title)}</h3>
        <p>${escapeHtml(tool.description)}</p>
        <div class="card-actions">
          <a class="open-tool" href="${tool.url}">자료 열기 ↗</a>
          <button class="qr-tool" type="button" aria-label="${escapeHtml(tool.title)} QR 열기">
            <span class="qr-glyph" aria-hidden="true">
              <i class="on"></i><i class="on"></i><i></i>
              <i class="on"></i><i></i><i class="on"></i>
              <i></i><i class="on"></i><i class="on"></i>
            </span>
          </button>
        </div>
      </div>
    `;
setupAutoThumbnail(card, tool);
    card.querySelector(".qr-tool").addEventListener("click", () => {
      openQr(tool.title, new URL(tool.url, window.location.href).href);
    });

    els.grid.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- QR ---------- */

function openQr(title, url) {
  currentQrUrl = url;
  els.qrTitle.textContent = title;
  els.qrUrl.textContent = url;
  els.qrCode.innerHTML = "";

  if (window.QRCode) {
    new QRCode(els.qrCode, { text: url, width: 190, height: 190, correctLevel: QRCode.CorrectLevel.M });
  } else {
    els.qrCode.textContent = "QR 라이브러리를 불러오지 못했습니다.";
  }

  els.modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeQr() {
  els.modal.hidden = true;
  document.body.style.overflow = "";
}

async function copyQrUrl() {
  if (!currentQrUrl) return;

  try {
    await navigator.clipboard.writeText(currentQrUrl);
    const oldText = els.copyBtn.textContent;
    els.copyBtn.textContent = "복사됨";
    setTimeout(() => (els.copyBtn.textContent = oldText), 1200);
  } catch {
    window.prompt("주소를 복사하세요.", currentQrUrl);
  }
}

/* ---------- 이벤트 ---------- */

els.search.addEventListener("input", renderTools);

els.reset.addEventListener("click", () => {
  els.search.value = "";
  setSubject("전체");
});

document.querySelector("#siteQrBtn").addEventListener("click", () => {
  openQr(document.title, window.location.href.split("#")[0]);
});

document.querySelectorAll("[data-close-modal]").forEach(element => {
  element.addEventListener("click", closeQr);
});

els.copyBtn.addEventListener("click", copyQrUrl);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !els.modal.hidden) closeQr();
});

applySiteConfig();
initializeSubjects();
els.count.textContent = TOOLS.length;
renderTools();
