/* ---------- 히어로 모션: "암호와 수"에서 다루는 소재를 차례로 보여 주는 루프 ----------
   01 스키테일 → 02 시저 원판 → 03 모스 부호와 이진법 → 04 바코드 체크숫자 → 05 소수와 RSA
   장면마다 3.6초, 전체 18초. 흑연색 + 오렌지 포인트만 쓰고 장면은 부드럽게 겹쳐 바뀐다.
   예전 모션(연필 선 → 수학 도형)은 git 기록에 남아 있다. */
(() => {
  const canvas = document.querySelector("#reelCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const W = 500, H = 588, CX = 250, SCENE = 3.6;
  const MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
  const SANS = 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const INK = "#15171a", ACC = "#ff5a30", MUTED = "#6b6f74", FAINT = "#b9b3a7";
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => (u = clamp(u), u * u * (3 - 2 * u));
  const span = (u, a, b) => ease((u - a) / (b - a));

  function label(g, str, x, y, o = {}) {
    g.save();
    g.font = `${o.weight || 600} ${o.size || 16}px ${o.font || MONO}`;
    g.fillStyle = o.color || INK; g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    g.textAlign = o.align || "center"; g.textBaseline = "middle";
    g.fillText(str, x, y);
    g.restore();
  }
  function header(g, no, title, caption) {
    label(g, no, 40, 44, { align: "left", size: 13, color: ACC, weight: 600 });
    label(g, title, 74, 44, { align: "left", size: 18, font: SANS, weight: 800 });
    label(g, caption, CX, 540, { size: 15, font: SANS, weight: 600, color: MUTED });
  }

  /* ---------- 01 스키테일: 띠의 글자가 막대에 감기면 문장이 보인다 ---------- */
  // 평문 ATTA / CKAT / DAWN 을 4칸씩 감아 쓰면 띠에는 세로로 읽은 글자가 남는다.
  const ROWS = ["ATTA", "CKAT", "DAWN"];
  const STRIP = [0, 1, 2, 3].flatMap(c => ROWS.map(r => r[c])); // ACDTKATAWATN
  function scytale(g, u) {
    header(g, "01", "스키테일 암호", "띠를 같은 굵기의 막대에 감아야 읽혀요");
    const wrap = span(u, 0.18, 0.62);
    // 막대
    g.save(); g.globalAlpha *= span(u, 0.05, 0.3);
    g.fillStyle = "#e9e4d9"; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.roundRect(118, 196, 264, 196, 22); g.fill(); g.stroke();
    g.clip(); // 감긴 띠 무늬는 막대 안에만
    g.strokeStyle = FAINT; g.lineWidth = 1.4;
    for (let i = -1; i < 7; i++) { g.beginPath(); g.moveTo(120 + i * 44, 392); g.lineTo(164 + i * 44, 196); g.stroke(); }
    g.restore();
    STRIP.forEach((ch, i) => {
      const col = Math.floor(i / 3), row = i % 3;
      const x0 = 52 + i * 36, y0 = 130;               // 풀린 띠
      const x1 = 160 + col * 60, y1 = 240 + row * 54; // 막대에 감긴 자리
      const x = lerp(x0, x1, wrap), y = lerp(y0, y1, wrap) - Math.sin(wrap * Math.PI) * 30;
      const lit = span(u, 0.66 + row * 0.06, 0.74 + row * 0.06);
      g.save();
      g.fillStyle = "#fff"; g.strokeStyle = lit > 0.5 ? ACC : INK; g.lineWidth = 1.6;
      g.beginPath(); g.roundRect(x - 15, y - 18, 30, 36, 6); g.fill(); g.stroke();
      g.restore();
      label(g, ch, x, y + 1, { size: 20, color: lit > 0.5 ? ACC : INK, weight: 700 });
    });
    label(g, "ACDTKATAWATN", CX, 452, { size: 18, color: MUTED, alpha: 1 - span(u, 0.62, 0.72), weight: 500 });
    label(g, "ATTACK AT DAWN", CX, 452, { size: 22, color: ACC, alpha: span(u, 0.72, 0.84), weight: 700 });
  }

  /* ---------- 02 시저 원판: 안쪽 원이 k칸 돌아간다 ---------- */
  function caesar(g, u) {
    header(g, "02", "시저 암호", "C = P + k · 25를 넘으면 26을 빼요");
    const k = 3 * span(u, 0.22, 0.6), cy = 290;
    g.save(); g.strokeStyle = FAINT; g.lineWidth = 1.5;
    [178, 132, 86].forEach(r => { g.beginPath(); g.arc(CX, cy, r, 0, Math.PI * 2); g.stroke(); });
    g.restore();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
      const show = u > 0.62;
      label(g, ABC[i], CX + 156 * Math.cos(a), cy + 156 * Math.sin(a), { size: 15, color: show && i === 0 ? ACC : INK, weight: 700 });
      const b = a - (k / 26) * Math.PI * 2; // 안쪽 원: 시계 반대로 k칸 → A 안쪽에 D가 온다
      label(g, ABC[i], CX + 109 * Math.cos(b), cy + 109 * Math.sin(b), { size: 14, color: show && i === 3 ? ACC : MUTED, weight: show && i === 3 ? 800 : 600, alpha: 0.95 });
    }
    label(g, "k = " + Math.round(k), CX, cy - 6, { size: 30, weight: 700 });
    label(g, "A → D", CX, cy + 28, { size: 16, color: ACC, alpha: span(u, 0.62, 0.74) });
  }

  /* ---------- 03 모스 부호와 이진법 ---------- */
  const MORSE = [[0, 0, 0], [1, 1, 1], [0, 0, 0]]; // S O S
  const BITS = "1011", PLACE = [8, 4, 2, 1];
  function morse(g, u) {
    header(g, "03", "모스 부호와 이진법", "두 가지 신호만으로 모든 수와 글자를");
    let n = 0;
    MORSE.forEach((letter, li) => {
      const x0 = 70 + li * 130;
      letter.forEach((sym, si) => {
        const show = span(u, 0.06 + n * 0.035, 0.1 + n * 0.035); n++;
        const x = x0 + si * 38, y = 170;
        g.save(); g.globalAlpha *= show; g.fillStyle = INK;
        if (sym) { g.beginPath(); g.roundRect(x - 6, y - 7, 30, 14, 7); g.fill(); }
        else { g.beginPath(); g.arc(x + 9, y, 7, 0, Math.PI * 2); g.fill(); }
        g.restore();
      });
      label(g, "SOS"[li], x0 + 47, 214, { size: 18, color: MUTED, alpha: span(u, 0.36, 0.46) });
    });
    // 이진법
    const on = span(u, 0.48, 0.58);
    BITS.split("").forEach((b, i) => {
      const x = 130 + i * 80, y = 330, lit = span(u, 0.55 + i * 0.05, 0.62 + i * 0.05);
      g.save(); g.globalAlpha *= on;
      g.fillStyle = b === "1" && lit > 0.5 ? ACC : "#fff"; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x - 28, y - 32, 56, 64, 10); g.fill(); g.stroke(); g.restore();
      label(g, b, x, y + 1, { size: 30, weight: 700, color: b === "1" && lit > 0.5 ? "#fff" : INK, alpha: on });
      label(g, String(PLACE[i]), x, y + 56, { size: 14, color: MUTED, alpha: on });
    });
    label(g, "1011₂ = 8 + 2 + 1 = 11", CX, 446, { size: 21, weight: 700, alpha: span(u, 0.76, 0.86) });
  }

  /* ---------- 04 바코드와 체크숫자 ---------- */
  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const DIG = "880123456789";
  const CHECK = (10 - DIG.split("").reduce((s, d, i) => s + (+d) * (i % 2 ? 3 : 1), 0) % 10) % 10;
  const CODE = "101" + (DIG + CHECK).slice(1).split("").map(d => L[+d]).join("") + "101";
  function barcode(g, u) {
    header(g, "04", "바코드와 체크숫자", "마지막 숫자로 잘못 읽은 곳을 찾아내요");
    const n = CODE.length, mw = 330 / n, x0 = CX - 165, grow = span(u, 0.05, 0.5);
    for (let i = 0; i < n; i++) {
      if (CODE[i] !== "1" || i / n > grow) continue;
      const last = i >= n - 3 - 7 && i < n - 3;
      g.fillStyle = last && u > 0.62 ? ACC : INK;
      g.fillRect(x0 + i * mw, 150, mw + 0.2, 220);
    }
    const all = DIG + CHECK;
    all.split("").forEach((d, i) => {
      label(g, d, x0 + 12 + i * (306 / 12), 396, { size: 17, weight: 600, color: i === 12 && u > 0.62 ? ACC : INK, alpha: span(u, 0.4 + i * 0.012, 0.5 + i * 0.012) });
    });
    label(g, `홀수 자리 ×1, 짝수 자리 ×3 → 합 + ${CHECK} = 10의 배수`, CX, 450, { size: 15, font: SANS, weight: 700, alpha: span(u, 0.64, 0.76) });
  }

  /* ---------- 05 소수와 RSA ---------- */
  const isPrime = m => { if (m < 2) return false; for (let d = 2; d * d <= m; d++) if (m % d === 0) return false; return true; };
  function primes(g, u) {
    header(g, "05", "소수와 RSA", "곱하기는 쉽고, 거꾸로 나누기는 어려워요");
    const sieve = span(u, 0.25, 0.55);
    for (let m = 1; m <= 36; m++) {
      const c = (m - 1) % 6, r = Math.floor((m - 1) / 6);
      const x = 115 + c * 54, y = 112 + r * 42, p = isPrime(m);
      const a = span(u, 0.02 + m * 0.005, 0.12 + m * 0.005) * (p ? 1 : 1 - 0.75 * sieve);
      label(g, String(m), x, y, { size: 18, weight: p && sieve > 0.5 ? 800 : 500, color: p && sieve > 0.5 ? ACC : INK, alpha: a });
      if (m === 3 || m === 11) {
        g.save(); g.globalAlpha *= span(u, 0.6, 0.7); g.strokeStyle = ACC; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    }
    label(g, "3 × 11 = 33", CX, 412, { size: 26, weight: 700, alpha: span(u, 0.66, 0.76) });
    label(g, "33 = ? × ?", CX, 458, { size: 20, color: MUTED, weight: 600, alpha: span(u, 0.78, 0.88) });
  }

  const SCENES = [scytale, caesar, morse, barcode, primes];
  const LOOP = SCENE * SCENES.length;

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(K, 0, 0, K, 0, 0);
    const idx = Math.floor(t / SCENE), u = (t - idx * SCENE) / SCENE;
    // 장면 끝 0.5초: 앞 장면이 먼저 사라진 뒤 다음 장면이 나타난다 (두 장면이 겹쳐 어지럽지 않게)
    const fade = 0.5 / SCENE;
    const draw = (i, local, alpha, dy) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, dy);
      SCENES[i % SCENES.length](ctx, local); ctx.restore();
    };
    if (u > 1 - fade) {
      const k = (u - (1 - fade)) / fade;
      if (k < 0.5) draw(idx, u, 1 - ease(k * 2), -10 * ease(k * 2));
      else draw(idx + 1, 0.02, ease(k * 2 - 1), 10 * (1 - ease(k * 2 - 1)));
    } else draw(idx, u, 1, 0);
    // 장면 번호 점
    SCENES.forEach((_, i) => {
      ctx.fillStyle = i === idx % SCENES.length ? ACC : FAINT;
      ctx.beginPath(); ctx.arc(CX - 40 + i * 20, 574, i === idx % SCENES.length ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
    });
  }

  let K = 1;
  function resize() {
    const css = canvas.clientWidth || 400, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(css * dpr);
    if (cw === canvas.width) return;
    canvas.width = cw; canvas.height = Math.round(cw * H / W);
    K = cw / W;
  }

  let start = performance.now(), visible = true, seekT = null;
  resize();
  new ResizeObserver(resize).observe(canvas);
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  function frame(now) {
    if (visible && seekT === null) render((((now - start) / 1000) % LOOP + LOOP) % LOOP); // 첫 프레임 시각이 start보다 앞설 수 있음
    requestAnimationFrame(frame);
  }
  // 학교 PC는 '애니메이션 효과'가 꺼진 경우가 많아, 움직임 줄이기 설정과 관계없이 재생한다.
  requestAnimationFrame(frame);

  // 확인용: heroReel.seek(5.2)로 특정 시각에 멈춰 볼 수 있다. seek(null)이면 다시 재생.
  window.heroReel = {
    seek(t) { seekT = t; if (t !== null) { resize(); render(((t % LOOP) + LOOP) % LOOP); } else start = performance.now(); }
  };
})();
