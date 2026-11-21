/* Deck engine: fixed 1920×1080 stage scaled to the window, keyboard/remote
   navigation with in-slide build steps, notes overlay, presenter window,
   timer, fullscreen, play/pause + reset hooks for the live demos. */
(function () {
  "use strict";
  const slides = [];
  let cur = -1, step = 0, startTime = null, slideStart = Date.now(), presenter = null;

  const $ = (s, r = document) => r.querySelector(s);
  const stage = () => $("#stage");

  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    // stage sits at left/top 50%; shift back by half its scaled size, then scale
    stage().style.transform = `translate(${-960 * s}px, ${-540 * s}px) scale(${s})`;
  }

  function add(def) { slides.push(def); }

  function applySteps() {
    const s = slides[cur];
    s.el.querySelectorAll("[data-step]").forEach((e) => {
      e.classList.toggle("hidden-step", +e.dataset.step > step);
    });
    if (s.onStep) s.onStep(step);
  }

  function go(i, st = 0) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i !== cur) {
      if (cur >= 0) {
        const old = slides[cur];
        old.el.classList.remove("active");
        try { old.leave && old.leave(); } catch (e) { console.error(e); }
      }
      cur = i;
      slideStart = Date.now();
      const s = slides[cur];
      s.el.classList.add("active");
      step = st === "last" ? (s.steps || 0) : st;
      try { s.enter && s.enter(s.el); } catch (e) { console.error(e); }
    } else {
      step = st === "last" ? (slides[cur].steps || 0) : st;
    }
    applySteps();
    history.replaceState(null, "", "#" + (cur + 1));
    $("#progress").style.width = ((cur + 1) / slides.length) * 100 + "%";
    $("#count").textContent = `${cur + 1} / ${slides.length}`;
    renderNotes();
    updatePresenter();
  }

  function next() {
    if (!startTime) startTime = Date.now();
    const s = slides[cur];
    if (step < (s.steps || 0)) { step++; applySteps(); updatePresenter(); }
    else if (cur < slides.length - 1) go(cur + 1, 0);
  }
  function prev() {
    if (step > 0) { step--; applySteps(); updatePresenter(); }
    else if (cur > 0) go(cur - 1, "last");
  }

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  const totalTarget = () => slides.reduce((a, s) => a + (s.duration || 0), 0);

  function noteHTML(i) {
    const s = slides[i];
    const n = (window.NOTES || [])[i] || {};
    const sec = (t, body) => body ? `<p><b>${t}:</b> ${body}</p>` : "";
    return `<h4>${i + 1}. ${s.title} <span class="dur">· target ${fmt(s.duration || 0)}</span></h4>` +
      sec("Argument", n.argument) +
      (n.points ? `<p><b>Points:</b></p><ul>${n.points.map((p) => `<li>${p}</li>`).join("")}</ul>` : "") +
      sec("Demo", n.demo) +
      (n.script ? `<p><b>Script:</b> ${n.script}</p>` : "") +
      sec("Math", n.math) + sec("Transition", n.transition);
  }
  function renderNotes() { $("#notes").innerHTML = noteHTML(cur); }

  function tick() {
    const el = $("#timer");
    if (el) el.textContent = startTime ? fmt((Date.now() - startTime) / 1000) : "0:00";
    updatePresenterClock();
  }

  // ---------- presenter window ----------
  function openPresenter() {
    presenter = window.open("", "deb-presenter", "width=1100,height=760");
    if (!presenter) { alert("Pop-up blocked: allow pop-ups for this file, or press N for the notes overlay."); return; }
    presenter.document.open();
    presenter.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Presenter view</title>
<style>
body{margin:0;background:#070b14;color:#d9e2f0;font:16px/1.55 "Segoe UI",Arial,sans-serif;display:grid;grid-template-rows:auto 1fr;height:100vh}
header{display:flex;gap:28px;align-items:center;padding:14px 22px;border-bottom:1px solid #22314d;background:#0b1222}
.big{font:600 30px Consolas,monospace;color:#2ee6d6}.lbl{font-size:12px;color:#7d8aa3;text-transform:uppercase;letter-spacing:.1em}
main{overflow:auto;padding:18px 26px}h4{font-size:20px;margin:0 0 8px;color:#fff}.dur{color:#2ee6d6;font-family:Consolas,monospace;font-size:16px}
b{color:#fff}li{margin:3px 0}.next{color:#7d8aa3}.over{color:#ff8a3d!important}
button{background:#17233b;color:#fff;border:1px solid #2c3f62;border-radius:8px;padding:8px 14px;font-size:15px;cursor:pointer}
</style></head><body><header>
<div><div class="lbl">Total</div><div class="big" id="pt">0:00</div></div>
<div><div class="lbl">This slide / target</div><div class="big" id="ps">0:00</div></div>
<div><div class="lbl">Slide · step</div><div class="big" id="pn"></div></div>
<div style="flex:1"><div class="lbl">Next</div><div class="next" id="px"></div></div>
<button id="bp">◀ Prev</button><button id="bn">Next ▶</button>
</header><main id="pm"></main></body></html>`);
    presenter.document.close();
    presenter.document.getElementById("bp").onclick = prev;
    presenter.document.getElementById("bn").onclick = next;
    presenter.document.addEventListener("keydown", onKey);
    updatePresenter();
  }
  function updatePresenter() {
    if (!presenter || presenter.closed) return;
    const d = presenter.document;
    d.getElementById("pm").innerHTML = noteHTML(cur);
    d.getElementById("pn").textContent = `${cur + 1}/${slides.length} · ${step}/${slides[cur].steps || 0}`;
    d.getElementById("px").textContent = cur < slides.length - 1 ? `${cur + 2}. ${slides[cur + 1].title}` : "— end —";
    updatePresenterClock();
  }
  function updatePresenterClock() {
    if (!presenter || presenter.closed) return;
    const d = presenter.document;
    const el = (Date.now() - slideStart) / 1000, tgt = slides[cur].duration || 0;
    d.getElementById("pt").textContent = (startTime ? fmt((Date.now() - startTime) / 1000) : "0:00") + " / " + fmt(totalTarget());
    const ps = d.getElementById("ps");
    ps.textContent = `${fmt(el)} / ${fmt(tgt)}`;
    ps.className = "big" + (el > tgt ? " over" : "");
  }

  function fullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  function togglePlay() { const s = slides[cur]; s.toggle && s.toggle(); }
  function reset() { const s = slides[cur]; s.reset && s.reset(); }

  function onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName) && e.target.type !== "range") return;
    const k = e.key;
    if (["ArrowRight", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); prev(); }
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
    else if (k === "f" || k === "F") fullscreen();
    else if (k === "n" || k === "N") document.body.classList.toggle("show-notes");
    else if (k === "p" || k === "P") openPresenter();
    else if (k === "k" || k === "K") togglePlay();
    else if (k === "r" || k === "R") reset();
    else if (k === "t" || k === "T") { startTime = Date.now(); tick(); }
    else if (k === "?" || k === "h" || k === "H") document.body.classList.toggle("show-help");
    else if (k === "Escape") document.body.classList.remove("show-help", "show-notes");
  }

  function init() {
    const root = stage();
    slides.forEach((s, i) => {
      const el = document.createElement("section");
      el.className = "slide";
      el.innerHTML = s.html + `<div class="slide-num">${String(i + 1).padStart(2, "0")} / ${slides.length}</div>` +
        (s.foot ? `<div class="slide-foot">${s.foot}</div>` : "");
      root.appendChild(el);
      s.el = el;
    });
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("keydown", onKey);
    // range sliders should not steal arrow keys from navigation focus forever
    document.addEventListener("mouseup", () => { if (document.activeElement && document.activeElement.type === "range") setTimeout(() => document.activeElement.blur(), 0); });
    $("#b-prev").onclick = prev; $("#b-next").onclick = next;
    $("#b-play").onclick = togglePlay; $("#b-reset").onclick = reset;
    $("#b-fs").onclick = fullscreen; $("#b-notes").onclick = () => document.body.classList.toggle("show-notes");
    $("#b-pres").onclick = openPresenter; $("#b-help").onclick = () => document.body.classList.toggle("show-help");
    $("#help").onclick = () => document.body.classList.remove("show-help");
    let hideT;
    document.addEventListener("mousemove", () => {
      document.body.classList.add("show-chrome");
      clearTimeout(hideT); hideT = setTimeout(() => document.body.classList.remove("show-chrome"), 2200);
    });
    const h = parseInt(location.hash.slice(1), 10);
    go(isNaN(h) ? 0 : h - 1, 0);
    setInterval(tick, 500);
  }

  window.Deck = { add, init, next, prev, go, get index() { return cur; }, get step() { return step; }, slides };
})();
