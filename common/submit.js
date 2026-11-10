// =========================================================
//  암호와 수 — 공통 입력·채점·제출 파일
//  모든 차시 페이지가 이 파일 하나를 불러 씁니다.
//  웹앱 주소는 아래 WEB_APP_URL 한 곳에만 적습니다.
//
//  페이지에서 쓰는 법
//   <input data-q="문항 이름">            → 답 입력칸 (textarea, select도 가능)
//   <button data-check="문항 이름">확인</button> → 바로 채점 (정답 탭과 비교)
//   <canvas data-draw="문항 이름"></canvas>  → 손그림 칸 (지우기 버튼 자동 추가)
//   <input id="studentId">, <button id="submitBtn">, <p id="submitStatus">
//   CN.init({ lesson: "폴더이름" })
// =========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby8qyRpI9g4y6S4MqrMumLNqxovFefAq2peDS1pa3sEOzJbEnvRXZTMc19ny-BmIJZb/exec"; // 앱스크립트 웹앱 배포 후 "https://script.google.com/macros/s/.../exec" 를 넣습니다.

const CN = (() => {
  const ID_RE = /^1(0[1-6])(0[1-9]|[12][0-9]|30)$/;
  let lesson = "";
  const attempts = {};
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const QUEUE = "cn-queue";

  function post(body) {
    if (!WEB_APP_URL) return Promise.reject(new Error("no-url"));
    return fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(r => r.json());
  }

  function fields() { return [...document.querySelectorAll("[data-q]")]; }

  function collect() {
    const answers = {};
    fields().forEach(el => { answers[el.dataset.q] = el.value.trim(); });
    const drawings = {};
    document.querySelectorAll("canvas[data-draw]").forEach(c => {
      if (c.dataset.dirty === "1") drawings[c.dataset.draw] = c.toDataURL("image/png");
    });
    return { answers, drawings };
  }

  // 임시 저장 (새로고침해도 입력이 남도록)
  function saveDraft() {
    const draft = {};
    fields().forEach(el => { draft[el.dataset.q] = el.value; });
    store.set("cn-draft-" + lesson, { draft, attempts });
  }
  function loadDraft() {
    const saved = store.get("cn-draft-" + lesson, null);
    if (!saved) return;
    fields().forEach(el => { if (saved.draft[el.dataset.q] != null) el.value = saved.draft[el.dataset.q]; });
    Object.assign(attempts, saved.attempts || {});
    const id = store.get("cn-student-id", "");
    const idEl = document.getElementById("studentId");
    if (idEl && id) idEl.value = id;
  }

  // 바로 채점
  function setupChecks() {
    document.querySelectorAll("[data-check]").forEach(btn => {
      const name = btn.dataset.check;
      const input = document.querySelector(`[data-q="${name}"]`);
      let mark = btn.nextElementSibling;
      if (!mark || !mark.classList.contains("check-mark")) {
        mark = document.createElement("span");
        mark.className = "check-mark";
        btn.after(mark);
      }
      btn.addEventListener("click", () => {
        if (!input || !input.value.trim()) { mark.textContent = "답을 먼저 쓰세요"; mark.className = "check-mark"; return; }
        if (!WEB_APP_URL) { mark.textContent = "채점 준비 중"; mark.className = "check-mark"; return; }
        const a = attempts[name] || { tries: 0, solved: false };
        if (!a.solved) a.tries += 1;
        attempts[name] = a;
        btn.disabled = true;
        mark.textContent = "확인 중…"; mark.className = "check-mark";
        post({ action: "check", lesson, item: name, answer: input.value.trim() })
          .then(res => {
            if (!res.ok) { mark.textContent = "확인할 수 없음"; return; }
            if (res.correct) { a.solved = true; mark.textContent = "맞음 ✓"; mark.className = "check-mark ok"; }
            else { mark.textContent = "다시 생각해 봐요"; mark.className = "check-mark no"; }
          })
          .catch(() => { mark.textContent = "연결 오류, 다시 눌러 주세요"; })
          .finally(() => { btn.disabled = false; saveDraft(); });
      });
    });
  }

  // 손그림 칸
  function setupDrawings() {
    document.querySelectorAll("canvas[data-draw]").forEach(c => {
      const ctx = c.getContext("2d");
      const fit = () => {
        const r = c.getBoundingClientRect();
        if (!r.width) return;
        const img = c.dataset.dirty === "1" ? c.toDataURL() : null;
        c.width = r.width * 2; c.height = r.height * 2;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        if (img) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0, c.width, c.height); i.src = img; }
      };
      fit(); new ResizeObserver(fit).observe(c);
      let drawing = false;
      const pos = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2]; };
      c.style.touchAction = "none";
      c.addEventListener("pointerdown", e => { drawing = true; c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
      c.addEventListener("pointermove", e => {
        if (!drawing) return;
        ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#15171a";
        ctx.lineTo(...pos(e)); ctx.stroke(); c.dataset.dirty = "1";
      });
      c.addEventListener("pointerup", () => { drawing = false; });
      const clear = document.createElement("button");
      clear.type = "button"; clear.className = "btn"; clear.textContent = "그림 지우기";
      clear.onclick = () => { c.dataset.dirty = "0"; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); };
      c.after(clear);
    });
  }

  // 보내지 못한 제출을 다시 보냄
  function flushQueue() {
    const q = store.get(QUEUE, []);
    if (!q.length || !WEB_APP_URL) return Promise.resolve(0);
    return q.reduce((p, item) => p.then(left =>
      post(item).then(res => (res.ok ? left : left.concat([item]))).catch(() => left.concat([item]))
    ), Promise.resolve([])).then(left => { store.set(QUEUE, left); return q.length - left.length; });
  }

  function setupSubmit() {
    const btn = document.getElementById("submitBtn");
    const idEl = document.getElementById("studentId");
    const status = document.getElementById("submitStatus");
    if (!btn || !idEl) return;
    const say = (t, cls) => { status.textContent = t; status.className = "status " + (cls || ""); };
    idEl.addEventListener("input", () => {
      idEl.value = idEl.value.replace(/\D/g, "").slice(0, 5);
      if (idEl.value.length === 5 && !ID_RE.test(idEl.value)) say("학번을 다시 확인하세요. 예) 1반 5번 → 10105", "error");
      else say("");
    });
    btn.addEventListener("click", () => {
      const id = idEl.value.trim();
      if (!ID_RE.test(id)) { say("학번 5자리를 바르게 쓰세요. 예) 1반 5번 → 10105", "error"); idEl.focus(); return; }
      store.set("cn-student-id", id);
      const { answers, drawings } = collect();
      const empty = Object.keys(answers).filter(k => !answers[k]).length;
      const tries = {};
      Object.keys(attempts).forEach(k => { tries[k] = attempts[k].solved ? attempts[k].tries : "미해결(" + attempts[k].tries + ")"; });
      const body = { action: "submit", lesson, studentId: id, answers, attempts: tries, drawings, clientTime: new Date().toISOString() };
      btn.disabled = true; say("제출하는 중…");
      post(body)
        .then(res => {
          if (!res.ok) throw new Error(res.error || "fail");
          say(`제출했습니다. (${res.count}번째 제출)` + (empty ? ` 빈칸 ${empty}개가 있어요. 채워서 다시 내도 됩니다.` : ""), "ok");
        })
        .catch(err => {
          const q = store.get(QUEUE, []); q.push(body); store.set(QUEUE, q);
          if (err.message === "no-url") say("아직 제출 주소가 준비되지 않아 이 기기에 보관했습니다.", "error");
          else say("인터넷 연결이 불안정해 이 기기에 보관했습니다. 연결되면 자동으로 다시 보냅니다.", "error");
        })
        .finally(() => { btn.disabled = false; });
    });
  }

  function init(opts) {
    lesson = opts.lesson;
    loadDraft();
    fields().forEach(el => el.addEventListener("input", saveDraft));
    setupChecks();
    setupDrawings();
    setupSubmit();
    flushQueue();
    window.addEventListener("online", flushQueue);
  }

  return { init };
})();
