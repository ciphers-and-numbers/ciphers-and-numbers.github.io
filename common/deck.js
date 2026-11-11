// =========================================================
//  암호와 수 — 차시 슬라이드 공통 동작 (모든 차시 페이지가 함께 씀)
//  슬라이드 넘기기, 아래쪽 바, 영상 구간 지키기, 학번·제출(submit.js) 연결
//  페이지에서: Deck.init({ lesson: "폴더이름" })  → 그다음 페이지 고유 JS
//  필요한 요소: .slide 여러 개, #prevBtn #nextBtn #pageNow #pageAll #pageTitle #deckDots
//  영상: <iframe data-src="https://www.youtube-nocookie.com/embed/ID?start=초&end=초&...&enablejsapi=1">
// =========================================================
const Deck = (() => {
  let slides = [], now = 0;

  // 영상 구간 지키기: 정해 둔 구간(start~end) 밖으로 넘기면 구간 안으로 되돌립니다.
  let ytReady = null;
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(res => { window.onYouTubeIframeAPIReady = res; });
    const t = document.createElement("script"); t.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(t);
    return ytReady;
  }
  function attachPlayer(f) {
    const q = new URLSearchParams(f.dataset.src.split("?")[1]);
    const start = +q.get("start") || 0, end = +q.get("end") || Infinity;
    const note = f.closest(".panel-body") && f.closest(".panel-body").querySelector(".video-note");
    loadYT().then(() => {
      let timer = null;
      f._player = new YT.Player(f, { events: { onStateChange: e => {
        clearInterval(timer);
        if (e.data !== YT.PlayerState.PLAYING) return;
        timer = setInterval(() => {
          const t = f._player.getCurrentTime();
          if (t >= end) { f._player.pauseVideo(); f._player.seekTo(end - 0.5, true); if (note) note.textContent = "오늘 볼 구간은 여기까지예요."; }
          else if (t < start - 1) { f._player.seekTo(start, true); if (note) note.textContent = "오늘 볼 구간의 처음으로 돌아왔어요."; }
          else if (note) note.textContent = "";
        }, 300);
      } } });
    });
  }

  function show(n) {
    now = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, i) => {
      s.classList.toggle("active", i === now);
      s.querySelectorAll("iframe[data-src]").forEach(f => {
        if (i === now && !f.src) { f.src = f.dataset.src + "&origin=" + encodeURIComponent(location.origin); attachPlayer(f); } // 처음 볼 때 불러오기
        if (i !== now && f._player && f._player.pauseVideo) f._player.pauseVideo(); // 넘기면 멈춤
      });
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("pageNow", now + 1); set("pageAll", slides.length); set("pageTitle", slides[now].dataset.title || "");
    document.getElementById("prevBtn").disabled = now === 0;
    document.getElementById("nextBtn").disabled = now === slides.length - 1;
    history.replaceState(null, "", "#" + (now + 1));
    window.scrollTo(0, 0);
    if (typeof CN !== "undefined") CN.refresh(now);
  }

  function init(opts) {
    slides = [...document.querySelectorAll(".slide")];
    document.getElementById("prevBtn").onclick = () => show(now - 1);
    document.getElementById("nextBtn").onclick = () => show(now + 1);
    document.addEventListener("keydown", e => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") show(now + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") show(now - 1);
    });
    show((parseInt(location.hash.slice(1), 10) || 1) - 1);
    if (typeof CN !== "undefined" && opts.lesson) {
      CN.init({ lesson: opts.lesson, onBadId: () => show(0), goto: k => show(k) });
      CN.refresh(now);
    }
    const ch = document.getElementById("changeIdBtn");
    if (ch) ch.onclick = () => { show(0); const id = document.getElementById("studentId"); if (id) id.focus(); };
  }

  return { init, show, current: () => now };
})();
