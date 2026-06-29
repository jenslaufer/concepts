/* =====================================================================
   embed.js — turn any simulator into a live, embeddable widget.

   Two jobs, one dependency-free file shared by every simulator:

   1. EMBED VIEW.  Loaded with ?embed (or ?embed=N for a single game),
      the page strips its chrome — top bar, hero, essay prose, sign-off,
      e-mail capture — leaving just the live, interactive game(s) plus a
      slim footer that links back to concepts.jenslaufer.com. That makes
      the page itself iframe-able: the calculator travels, and the
      backlink travels with it.

   2. EMBED BUTTON.  On the normal page it adds an "Embed ↗" control to
      the top bar. It opens a small panel: pick the whole simulator or
      a single game, copy a ready-made <iframe> snippet.

   No per-simulator code: it reads the concept name from the top bar and
   the games from section.act, both of which every simulator already has.
   ===================================================================== */
(function () {
  "use strict";

  var SITE = "concepts.jenslaufer.com";
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  var params = new URLSearchParams(location.search);
  var EMBED = params.has("embed");

  function txt(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
  function conceptName() {
    var b = document.querySelector(".brand b");
    return b ? txt(b) : (document.title.split("—")[0] || document.title).trim();
  }
  function canonicalPath() { return location.pathname.replace(/index\.html$/, "") || "/"; }
  function games() { return [].slice.call(document.querySelectorAll("section.act")); }

  /* ---------- 1. EMBED VIEW ---------------------------------------- */
  function renderEmbed() {
    var only = params.get("embed");           // "" | "1" | "2" | "3"
    document.documentElement.classList.add("cs-embed");

    var css = document.createElement("style");
    css.textContent =
      ".cs-embed .topbar,.cs-embed .hero,.cs-embed header,.cs-embed section.capture," +
        ".cs-embed section.closing,.cs-embed .credits,.cs-embed .sig{display:none!important}" +
      ".cs-embed section.act>p{display:none!important}" +
      ".cs-embed main,.cs-embed main.wrap{padding-top:20px!important;padding-bottom:0!important}" +
      ".cs-embed section.act{padding-top:6px!important;margin-top:0!important}" +
      ".cs-attrib{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;" +
        "font-family:" + MONO + ";font-size:12px;letter-spacing:.02em;line-height:1.5;" +
        "max-width:760px;margin:24px auto 10px;padding:14px 4px 4px;" +
        "border-top:1px solid var(--line-2,#d4cab4);color:var(--ink-faint,#8a8275)}" +
      ".cs-attrib a{color:var(--accent,#b07a1f);text-decoration:none;font-weight:600}" +
      ".cs-attrib a:hover{text-decoration:underline}";
    document.head.appendChild(css);

    // single-game embed: keep one, hide the rest
    if (only && /^\d+$/.test(only)) {
      var gs = games(), keep = document.getElementById("act" + only) || gs[(+only) - 1];
      gs.forEach(function (s) { if (s !== keep) s.style.display = "none"; });
    }

    // the travelling backlink
    var bar = document.createElement("div");
    bar.className = "cs-attrib";
    var url = "https://" + SITE + canonicalPath();
    bar.innerHTML =
      '<span>' + conceptName() + '</span>' +
      '<a href="' + url + '" target="_blank" rel="noopener">▶ play the full version · ' + SITE + '</a>';
    (document.querySelector("main") || document.body).appendChild(bar);

    // let a host page auto-resize the iframe if it wants to
    function postHeight() {
      try {
        parent.postMessage({ type: "cs-embed-height", path: canonicalPath(),
          height: Math.ceil(document.body.scrollHeight) }, "*");
      } catch (e) {}
    }
    addEventListener("load", postHeight);
    addEventListener("resize", postHeight);
    setTimeout(postHeight, 500);
  }

  /* ---------- 2. EMBED BUTTON -------------------------------------- */
  function snippet(path, gameVal, label) {
    var u = "https://" + SITE + path + "?embed" + (gameVal ? "=" + gameVal : "");
    var h = gameVal ? 680 : 1200;
    return '<iframe src="' + u + '" title="' + label + '" loading="lazy" ' +
           'width="100%" height="' + h + '" ' +
           'style="max-width:760px;border:1px solid #d4cab4;border-radius:14px"></iframe>';
  }

  function buildPanel() {
    var path = canonicalPath(), name = conceptName(), gs = games();
    var opts = [{ v: "", t: "Whole simulator" }];
    gs.forEach(function (s, i) {
      opts.push({ v: String(i + 1), t: txt(s.querySelector(".actnum")) || ("Game " + (i + 1)) });
    });

    var panel = document.createElement("div");
    panel.className = "cs-embed-panel";
    panel.innerHTML =
      '<div class="cs-embed-h">Embed this simulator</div>' +
      '<div class="cs-embed-sub">Live and interactive — drop it into any page. A link back to ' +
        SITE + ' travels with it.</div>' +
      '<select class="cs-embed-sel">' +
        opts.map(function (o) { return '<option value="' + o.v + '">' + o.t + '</option>'; }).join("") +
      '</select>' +
      '<textarea class="cs-embed-code" readonly rows="3"></textarea>' +
      '<button type="button" class="cs-embed-copy">Copy code</button>';

    var sel = panel.querySelector(".cs-embed-sel");
    var code = panel.querySelector(".cs-embed-code");
    var copy = panel.querySelector(".cs-embed-copy");
    function refresh() {
      var o = opts[sel.selectedIndex];
      code.value = snippet(path, o.v, name + (o.v ? " — " + o.t : ""));
    }
    sel.addEventListener("change", refresh); refresh();
    copy.addEventListener("click", function () {
      code.focus(); code.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      if (navigator.clipboard) { navigator.clipboard.writeText(code.value).then(function(){}, function(){}); ok = true; }
      copy.textContent = ok ? "Copied ✓" : "Press ⌘C";
      setTimeout(function () { copy.textContent = "Copy code"; }, 1700);
    });
    return panel;
  }

  function addButton() {
    // Most sims have a .topbar-r cluster; a few older ones (e.g. convex) don't —
    // fall back to sitting just before the Concepts menu, then to the top bar itself.
    var slot = document.querySelector(".topbar-r"), ref = null;
    if (!slot) {
      var cnav = document.querySelector(".topbar .cnav");
      if (cnav) { slot = cnav.parentNode; ref = cnav; }
      else { slot = document.querySelector(".topbar .wrap") || document.querySelector(".topbar"); }
    }
    if (!slot) return;

    var css = document.createElement("style");
    css.textContent =
      ".cs-embed-wrap{position:relative;display:inline-block}" +
      ".cs-embed-btn{font-family:" + MONO + ";font-size:11.5px;font-weight:600;letter-spacing:.06em;" +
        "text-transform:uppercase;cursor:pointer;border:1px solid var(--line-2,#d4cab4);" +
        "background:var(--paper,#faf7f1);color:var(--ink-soft,#544e44);padding:6px 12px;" +
        "border-radius:999px;transition:all .15s ease;white-space:nowrap}" +
      ".cs-embed-btn:hover{color:var(--ink,#1d1a16);border-color:var(--ink-faint,#8a8275)}" +
      ".cs-embed-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:60;width:330px;max-width:86vw;" +
        "background:var(--card,#fffdf8);border:1px solid var(--line-2,#d4cab4);border-radius:12px;" +
        "padding:15px 16px;box-shadow:0 14px 38px rgba(40,32,18,.17);display:none;text-align:left}" +
      ".cs-embed-wrap.open .cs-embed-panel{display:block}" +
      ".cs-embed-h{font-family:var(--serif,Georgia,serif);font-size:18px;font-weight:600;" +
        "color:var(--ink,#1d1a16);margin-bottom:4px}" +
      ".cs-embed-sub{font-size:12.5px;line-height:1.5;color:var(--ink-soft,#544e44);margin-bottom:12px}" +
      ".cs-embed-sel{width:100%;box-sizing:border-box;font-family:var(--sans,system-ui);font-size:13px;" +
        "padding:7px 9px;margin-bottom:10px;border:1px solid var(--line-2,#d4cab4);border-radius:8px;" +
        "background:var(--paper,#faf7f1);color:var(--ink,#1d1a16)}" +
      ".cs-embed-code{width:100%;box-sizing:border-box;font-family:" + MONO + ";font-size:11px;line-height:1.5;" +
        "padding:9px 10px;border:1px solid var(--line-2,#d4cab4);border-radius:8px;" +
        "background:var(--paper,#faf7f1);color:var(--ink-soft,#544e44);resize:none;margin-bottom:10px}" +
      ".cs-embed-copy{font-family:" + MONO + ";font-size:11.5px;font-weight:600;letter-spacing:.04em;" +
        "cursor:pointer;border:1px solid var(--ink,#1d1a16);background:var(--ink,#1d1a16);" +
        "color:var(--paper,#faf7f1);padding:7px 14px;border-radius:999px;transition:opacity .15s}" +
      ".cs-embed-copy:hover{opacity:.85}";
    document.head.appendChild(css);

    var wrap = document.createElement("div");
    wrap.className = "cs-embed-wrap";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "cs-embed-btn"; btn.textContent = "Embed ↗";
    wrap.appendChild(btn);
    wrap.appendChild(buildPanel());
    slot.insertBefore(wrap, ref || slot.firstChild);

    btn.addEventListener("click", function (e) { e.stopPropagation(); wrap.classList.toggle("open"); });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) wrap.classList.remove("open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") wrap.classList.remove("open"); });
  }

  function init() { if (EMBED) renderEmbed(); else addButton(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
