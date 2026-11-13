// 메인 화면 입구의 암호 문제. 한 번 풀면 이 기기에서는 다시 묻지 않습니다.
// 진짜 잠금이 아니라 "입구의 관문"입니다. (차시 주소를 직접 열면 그대로 열립니다)
// 문제를 바꾸려면 아래 목록에 ["암호문", 민 칸 수]를 고치면 됩니다. 정답은 적지 않습니다.
(function () {
  const KEY = "cn-gate";
  const PUZZLES = [["ZHOFRPH", 3], ["QRGP", 2], ["QVAAMF", 1], ["WGLSSP", 4], ["KWNJSI", 5], ["HQWHU", 3], ["UOKNG", 2], ["IBQQZ", 1]];
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const root = document.documentElement, gate = document.getElementById("gate");
  if (!gate || !root.classList.contains("gate-locked")) return;

  const shift = (w, k) => [...w].map(c => A[(A.indexOf(c) + k + 26) % 26]).join("");
  const $ = id => document.getElementById(id);
  let cur = -1, wrong = 0;

  function pick() {
    let n; do { n = Math.floor(Math.random() * PUZZLES.length); } while (n === cur && PUZZLES.length > 1);
    cur = n; wrong = 0;
    const [c, k] = PUZZLES[cur];
    $("gateCipher").textContent = c.split("").join(" ");
    $("gateRule").innerHTML = `알파벳을 <b>${k}칸씩 뒤로</b> 밀어 만든 암호예요. 글자마다 <b>${k}칸씩 앞으로</b> 되돌려 보세요.`;
    $("gateEx").textContent = `예) ${shift("A", k)} → A,  ${shift("B", k)} → B`;
    $("gateInput").value = ""; $("gateMsg").textContent = ""; $("gateMsg").className = "gate-msg";
  }
  function check() {
    const [c, k] = PUZZLES[cur];
    const v = $("gateInput").value.toUpperCase().replace(/[^A-Z]/g, "");
    if (!v) { $("gateMsg").textContent = "풀어낸 낱말을 영어로 써 주세요."; return; }
    if (shift(v, k) === c) {
      try { localStorage.setItem(KEY, "ok"); } catch (e) {}
      $("gateMsg").textContent = "풀었어요! 문이 열립니다."; $("gateMsg").className = "gate-msg ok";
      setTimeout(() => { root.classList.remove("gate-locked"); gate.hidden = true; if (location.hash) { const t = document.querySelector(location.hash); if (t) t.scrollIntoView(); } }, 600);
      return;
    }
    const first = shift(c[0], -k);
    $("gateMsg").className = "gate-msg no";
    if (v.length !== c.length) { $("gateMsg").textContent = `글자 수가 달라요. 암호문은 ${c.length}글자예요.`; return; }
    wrong += 1;
    $("gateMsg").textContent = wrong >= 4 ? `힌트: ${c[0]} → ${first}, ${c[1]} → ${shift(c[1], -k)}. 나머지도 같은 방법으로 되돌려요.`
      : wrong >= 2 ? `힌트: 첫 글자 ${c[0]}는 ${k}칸 앞의 ${first}예요.`
      : "아직 아니에요. 아래 알파벳 줄에서 칸을 세어 보세요.";
  }

  $("gateAlpha").innerHTML = [...A].map(l => `<span>${l}</span>`).join("");
  $("gateForm").addEventListener("submit", e => { e.preventDefault(); check(); });
  $("gateOther").addEventListener("click", pick);
  pick();
})();
