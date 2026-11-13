// =========================================================
//  암호와 수 — 공통 입력·채점·제출 파일
//  모든 차시 페이지가 이 파일 하나를 불러 씁니다.
//  웹앱 주소는 아래 WEB_APP_URL 한 곳에만 적습니다.
//
//  페이지에서 쓰는 법
//   <input data-q="문항 이름">            → 답 입력칸 (textarea, select도 가능)
//   <button data-check="문항 이름">확인</button> → 바로 채점 (정답 탭과 비교)
//   <textarea data-q="문항 이름" data-free>  → 빈칸 안내에서 세지 않는 칸 (상황에 따라 비워도 되는 칸)
//   <canvas data-draw="문항 이름"></canvas>  → 손그림 칸 (지우기 버튼 자동 추가)
//   <input id="studentId">, <button id="submitBtn">, <p id="submitStatus">
//   CN.init({ lesson: "폴더이름", goto: n => show(n) })
//   슬라이드 진행 점: <div id="deckDots"></div>  (슬라이드 = .slide, 선택 활동은 data-optional)
//   빈칸 안내:       <div id="emptyList"></div>  (제출 화면에 둠)
//   슬라이드를 넘길 때 CN.refresh(현재번호) 를 부르면 현재 점이 표시됩니다.
// =========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby8qyRpI9g4y6S4MqrMumLNqxovFefAq2peDS1pa3sEOzJbEnvRXZTMc19ny-BmIJZb/exec"; // 앱스크립트 웹앱 배포 후 "https://script.google.com/macros/s/.../exec" 를 넣습니다.

const CN = (() => {
  const ID_RE = /^1(0[1-6])(0[1-9]|[12][0-9]|30)$/;
  let lesson = "";
  let onBadId = null;
  let goto = null;
  let current = 0;
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
    const id = store.get("cn-student-id", "");
    const idEl = document.getElementById("studentId");
    if (idEl && id) idEl.value = id;
    const saved = store.get("cn-draft-" + lesson, null);
    if (!saved) return;
    fields().forEach(el => { if (saved.draft[el.dataset.q] != null) el.value = saved.draft[el.dataset.q]; });
    Object.assign(attempts, saved.attempts || {});
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
      let checked = null;   // 마지막으로 채점한 답
      if (input) {
        // 답을 고치면 예전 채점 표시는 지운다 (고친 답이 채점된 것처럼 보이지 않게)
        input.addEventListener("input", () => {
          if (checked !== null && input.value.trim() !== checked) { mark.textContent = ""; mark.className = "check-mark"; checked = null; }
        });
        // 한 줄 입력칸에서 엔터를 누르면 확인
        if (input.tagName === "INPUT") input.addEventListener("keydown", e => {
          if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); btn.click(); }
        });
      }
      // 새로고침해도, 맞힌 답이 그대로면 "맞음" 표시를 되살린다
      const prev = attempts[name];
      if (input && prev && prev.solved && prev.answer != null && prev.answer === input.value.trim()) {
        checked = prev.answer;
        setTimeout(() => { if (input.value.trim() === prev.answer) { mark.textContent = "맞음 ✓"; mark.className = "check-mark ok"; } }, 0);
      }
      btn.addEventListener("click", () => {
        if (!input || !input.value.trim()) { mark.textContent = "답을 먼저 쓰세요"; mark.className = "check-mark"; return; }
        if (!WEB_APP_URL) { mark.textContent = "채점 준비 중"; mark.className = "check-mark"; return; }
        const a = attempts[name] || { tries: 0, solved: false };
        if (!a.solved) a.tries += 1;
        attempts[name] = a;
        btn.disabled = true;
        mark.textContent = "확인 중…"; mark.className = "check-mark";
        const sent = input.value.trim();
        post({ action: "check", lesson, item: name, answer: sent })
          .then(res => {
            checked = sent;
            if (!res.ok) { mark.textContent = "확인할 수 없음"; return; }
            if (res.correct) { a.solved = true; a.answer = sent; mark.textContent = "맞음 ✓"; mark.className = "check-mark ok"; }
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

  // 슬라이드별 진행 상황
  function slideList() { return [...document.querySelectorAll(".slide")]; }
  function progress() {
    return slideList().map((sl, i) => {
      // data-free 칸(상황에 따라 비워 둘 수 있는 칸)은 세지 않고, 학번 칸은 바른 학번이면 채운 것으로 셉니다.
      const f = [...sl.querySelectorAll("[data-q]:not([data-free])")];
      let filled = f.filter(el => el.value.trim()).length;
      const idEl = sl.querySelector("#studentId");
      if (idEl) { f.push(idEl); if (ID_RE.test(idEl.value)) filled++; }
      return { i, total: f.length, filled, optional: sl.hasAttribute("data-optional"), title: sl.dataset.title || "" };
    });
  }
  function renderProgress() {
    const pr = progress();
    const dots = document.getElementById("deckDots");
    if (dots) {
      if (dots.children.length !== pr.length) {
        dots.innerHTML = "";
        pr.forEach(p => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "dot-btn";
          b.addEventListener("click", () => goto && goto(p.i));
          dots.appendChild(b);
        });
      }
      pr.forEach((p, k) => {
        const b = dots.children[k];
        const state = !p.total ? "none" : p.filled === p.total ? "done" : p.filled ? "part" : "empty";
        b.className = "dot-btn " + state + (p.optional ? " optional" : "") + (k === current ? " now" : "");
        b.title = `${k + 1}. ${p.title}` + (p.total ? ` (${p.filled}/${p.total}칸)` : "");
        b.setAttribute("aria-label", b.title);
      });
    }
    const box = document.getElementById("emptyList");
    if (box) {
      const need = pr.filter(p => p.total && p.filled < p.total && !p.optional);
      const opt = pr.filter(p => p.total && p.filled < p.total && p.optional);
      box.innerHTML = "";
      const line = (label, list) => {
        if (!list.length) return;
        const row = document.createElement("p"); row.className = "empty-row"; row.textContent = label;
        list.forEach(p => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "btn mini";
          b.textContent = `${p.i + 1}번 · ${p.total - p.filled}칸`;
          b.title = p.title;
          b.addEventListener("click", () => goto && goto(p.i));
          row.appendChild(b);
        });
        box.appendChild(row);
      };
      if (!need.length && !opt.length) { box.innerHTML = '<p class="empty-row ok">모든 칸을 채웠어요. 제출해 보세요!</p>'; return; }
      if (!need.length) box.innerHTML = '<p class="empty-row ok">꼭 할 활동은 모두 채웠어요.</p>';
      line("아직 빈칸이 있는 슬라이드:", need);
      line("선택 활동의 빈칸:", opt);
    }
  }
  function refresh(n) { if (typeof n === "number") current = n; renderProgress(); }

  // 보내지 못한 제출을 다시 보냄
  function flushQueue() {
    const q = store.get(QUEUE, []).filter(item => item.subId); // 제출번호 없는 옛 보관본은 버림
    store.set(QUEUE, q);
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
    // 학번 칸은 첫 슬라이드에 두고, 확인 문구는 학번 칸 옆(#studentIdStatus)과 제출 화면(#studentIdView)에 보여 줍니다.
    const idStatus = document.getElementById("studentIdStatus");
    const idView = document.getElementById("studentIdView");
    const sayId = (t, cls) => { if (idStatus) { idStatus.textContent = t; idStatus.className = "status " + (cls || ""); } };
    const showId = () => {
      const v = idEl.value;
      if (idView) idView.textContent = ID_RE.test(v) ? `${v} (${+v.slice(1, 3)}반 ${+v.slice(3)}번)` : "아직 입력하지 않았어요";
      if (!v) sayId("");
      else if (v.length < 5) sayId("5자리를 모두 써 주세요.");
      else if (!ID_RE.test(v)) sayId("학번을 다시 확인하세요. 예) 1반 5번 → 10105", "error");
      else sayId(`${+v.slice(1, 3)}반 ${+v.slice(3)}번 학생, 반가워요!`, "ok");
    };
    idEl.addEventListener("input", () => {
      idEl.value = idEl.value.replace(/\D/g, "").slice(0, 5);
      if (ID_RE.test(idEl.value)) store.set("cn-student-id", idEl.value);
      showId();
      renderProgress();
    });
    showId();
    btn.addEventListener("click", () => {
      const id = idEl.value.trim();
      if (!ID_RE.test(id)) {
        say("첫 화면에서 학번 5자리를 바르게 써 주세요. 예) 1반 5번 → 10105", "error");
        if (typeof onBadId === "function") onBadId();
        idEl.focus(); return;
      }
      store.set("cn-student-id", id);
      const { answers, drawings } = collect();
      const empty = progress().filter(p => !p.optional).reduce((a, p) => a + (p.total - p.filled), 0);
      const tries = {};
      Object.keys(attempts).forEach(k => { tries[k] = attempts[k].solved ? attempts[k].tries : "미해결(" + attempts[k].tries + ")"; });
      const subId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      const body = { action: "submit", subId, lesson, studentId: id, answers, attempts: tries, drawings, clientTime: new Date().toISOString() };
      btn.disabled = true; say("제출하는 중…");
      const done = count => say(`제출했습니다. (${count}번째 제출)` + (empty ? ` 빈칸 ${empty}개가 있어요. 아래 버튼으로 찾아가 채운 뒤 다시 내도 됩니다.` : ""), "ok");
      // 제출 응답을 못 받으면, 짧은 확인 요청으로 저장됐는지 다시 물어봅니다.
      const confirmSaved = (left) => new Promise(r => setTimeout(r, 2500))
        .then(() => post({ action: "status", lesson, subId }))
        .then(res => (res.ok && res.found ? res.count : (left > 1 ? confirmSaved(left - 1) : 0)))
        .catch(() => (left > 1 ? confirmSaved(left - 1) : 0));
      post(body)
        .then(res => {
          if (!res.ok) throw new Error(res.error || "fail");
          done(res.count);
        })
        .catch(err => {
          console.warn("제출 응답 오류:", err);
          if (err.message === "no-url") {
            const q = store.get(QUEUE, []); q.push(body); store.set(QUEUE, q);
            say("아직 제출 주소가 준비되지 않아 이 기기에 보관했습니다.", "error");
            return;
          }
          say("제출을 확인하는 중…");
          return confirmSaved(4).then(count => {
            if (count) { done(count); return; }
            const q = store.get(QUEUE, []); q.push(body); store.set(QUEUE, q);
            say("응답을 받지 못해 이 기기에 보관했습니다. 다음에 이 페이지를 열 때 자동으로 다시 보냅니다. (두 번 저장되지는 않습니다)", "error");
          });
        })
        .finally(() => { btn.disabled = false; });
    });
  }

  function init(opts) {
    lesson = opts.lesson;
    onBadId = opts.onBadId || null;
    goto = opts.goto || null;
    loadDraft();
    fields().forEach(el => {
      // 이름표(label)가 없는 칸은 화면 읽기 프로그램이 읽을 이름을 붙인다
      if (el.type !== "hidden" && !el.closest("label") && !el.getAttribute("aria-label")) el.setAttribute("aria-label", el.dataset.q);
      el.addEventListener("input", () => { saveDraft(); renderProgress(); });
      el.addEventListener("change", () => { saveDraft(); renderProgress(); });
    });
    setupChecks();
    setupDrawings();
    setupSubmit();
    renderProgress();
    flushQueue();
    window.addEventListener("online", flushQueue);
  }

  return { init, refresh };
})();
