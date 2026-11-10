/**
 * 암호와 수 — 제출 서버 (Google Apps Script 웹앱)
 *
 * 받는 요청 (Content-Type: text/plain, 본문은 JSON 문자열)
 *   { action: "check",  lesson, item, answer }  → { ok, correct }
 *   { action: "submit", lesson, studentId, answers, attempts, drawings, clientTime } → { ok, count }
 *
 * 시트 구성
 *   <차시 폴더이름> 탭 : 제출시각 | 차시 | 학번 | 제출 횟수 | 문항들… | 점수
 *   정답 탭           : 차시 | 문항 | 정답   (정답은 답1|답2 처럼 여러 개 허용, 띄어쓰기·대소문자 무시)
 *   요약 탭           : 차시 | 제출 학생 수 | 제출 건수 | 평균 점수 | 최고 점수 평균
 *
 * 스크립트 속성(선택)
 *   SHEET_ID        : 시트 ID. 비우면 이 스크립트가 붙어 있는 시트를 씁니다.
 *   DRAW_FOLDER_ID  : 손그림을 저장할 드라이브 폴더 ID. 비우면 처음 저장할 때 폴더를 만듭니다.
 */

const FIXED = ["제출시각", "차시", "학번", "제출 횟수"];
const SCORE = "점수";
const ID_RE = /^1(0[1-6])(0[1-9]|[12][0-9]|30)$/;
const LESSON_RE = /^[a-z0-9-]{1,60}$/;

function doGet() {
  return out_({ ok: true, message: "암호와 수 제출 서버가 작동 중입니다." });
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!LESSON_RE.test(String(d.lesson || ""))) return out_({ ok: false, error: "차시 이름 오류" });
    if (d.action === "check") return out_(check_(d));
    if (d.action === "submit") return out_(submit_(d));
    return out_({ ok: false, error: "알 수 없는 요청" });
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: "서버 오류" });
  }
}

/** 처음 한 번 실행: 정답·요약 탭을 만듭니다. (편집기에서 setup 선택 후 실행) */
function setup() {
  const ss = ss_();
  sheet_(ss, "정답", ["차시", "문항", "정답"]);
  sheet_(ss, "요약", ["차시", "제출 학생 수", "제출 건수", "평균 점수", "최고 점수 평균"]);
  DriveApp.getRootFolder(); // 드라이브 권한을 처음 승인할 때 함께 받기 위한 줄
}

// ---------------------------------------------------------

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
  }
  return sh;
}

function norm_(s) {
  return String(s == null ? "" : s).replace(/\s+/g, "").toUpperCase();
}

/** 정답 탭에서 해당 차시의 { 문항: [정답들] } 을 읽습니다. */
function answers_(lesson) {
  const sh = ss_().getSheetByName("정답");
  const map = {};
  if (!sh) return map;
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() === lesson && String(v[i][1]).trim()) {
      map[String(v[i][1]).trim()] = String(v[i][2]).split("|").map(norm_).filter(String);
    }
  }
  return map;
}

function check_(d) {
  const list = answers_(d.lesson)[String(d.item || "").trim()];
  if (!list) return { ok: false, error: "정답이 등록되지 않은 문항" };
  return { ok: true, correct: list.indexOf(norm_(d.answer)) >= 0 };
}

function submit_(d) {
  const id = String(d.studentId || "");
  if (!ID_RE.test(id)) return { ok: false, error: "학번 형식 오류" };
  const answers = d.answers || {};
  const attempts = d.attempts || {};
  const drawings = d.drawings || {};

  // 손그림은 잠금 밖에서 먼저 드라이브에 저장
  const drawLinks = {};
  Object.keys(drawings).forEach(name => {
    const m = String(drawings[name]).match(/^data:image\/png;base64,(.+)$/);
    if (!m) return;
    const blob = Utilities.newBlob(Utilities.base64Decode(m[1]), "image/png",
      d.lesson + "_" + id + "_" + name + "_" + Date.now() + ".png");
    drawLinks[name] = drawFolder_().createFile(blob).getUrl();
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = ss_();
    const sh = sheet_(ss, d.lesson, FIXED.concat([SCORE]));
    let header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);

    // 새 문항 열은 점수 열 바로 앞에 끼워 넣습니다.
    const cols = Object.keys(answers)
      .concat(Object.keys(drawLinks).map(n => n + " (그림)"))
      .concat(Object.keys(attempts).map(n => n + " (시도)"));
    cols.forEach(c => {
      if (header.indexOf(c) >= 0) return;
      const at = header.indexOf(SCORE) + 1; // 1부터 세는 열 번호
      sh.insertColumnBefore(at);
      sh.getRange(1, at).setValue(c);
      header.splice(at - 1, 0, c);
    });

    // 제출 횟수
    const last = sh.getLastRow();
    let count = 1;
    if (last > 1) {
      const ids = sh.getRange(2, 3, last - 1, 1).getValues();
      ids.forEach(r => { if (String(r[0]) === id) count++; });
    }

    // 점수: 정답 탭에 등록된 문항 중 맞힌 개수
    const key = answers_(d.lesson);
    let score = 0;
    Object.keys(key).forEach(q => { if (key[q].indexOf(norm_(answers[q])) >= 0) score++; });

    const row = header.map(h => {
      if (h === "제출시각") return new Date();
      if (h === "차시") return d.lesson;
      if (h === "학번") return "'" + id;
      if (h === "제출 횟수") return count;
      if (h === SCORE) return score;
      if (h.endsWith(" (그림)")) return drawLinks[h.slice(0, -5)] || "";
      if (h.endsWith(" (시도)")) return attempts[h.slice(0, -5)] != null ? attempts[h.slice(0, -5)] : "";
      return answers[h] != null ? String(answers[h]) : "";
    });
    sh.appendRow(row);
    updateSummary_(ss, d.lesson, sh);
    return { ok: true, count: count };
  } finally {
    lock.release();
  }
}

function drawFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("DRAW_FOLDER_ID");
  if (id) return DriveApp.getFolderById(id);
  const folder = DriveApp.createFolder("암호와수_학생그림");
  props.setProperty("DRAW_FOLDER_ID", folder.getId());
  return folder;
}

/** 요약 탭의 해당 차시 줄을 갱신합니다. */
function updateSummary_(ss, lesson, sh) {
  const v = sh.getDataRange().getValues();
  const h = v[0].map(String);
  const iId = h.indexOf("학번"), iScore = h.indexOf(SCORE);
  const best = {};
  let total = 0, n = 0;
  for (let r = 1; r < v.length; r++) {
    const id = String(v[r][iId]), s = Number(v[r][iScore]) || 0;
    total += s; n++;
    best[id] = Math.max(best[id] == null ? -1 : best[id], s);
  }
  const ids = Object.keys(best);
  const bestAvg = ids.length ? ids.reduce((a, k) => a + best[k], 0) / ids.length : 0;
  const sum = sheet_(ss, "요약", ["차시", "제출 학생 수", "제출 건수", "평균 점수", "최고 점수 평균"]);
  const rows = sum.getDataRange().getValues();
  let at = rows.findIndex((r, i) => i > 0 && String(r[0]) === lesson) + 1;
  if (at <= 0) at = sum.getLastRow() + 1;
  sum.getRange(at, 1, 1, 5).setValues([[lesson, ids.length, n, n ? Math.round(total / n * 100) / 100 : 0, Math.round(bestAvg * 100) / 100]]);
}
