/* =====================================================================
   plot-share.js — make every individual plot shareable.

   Drop-in, dependency-free, shared by all simulators. For each plot card
   (a .card that contains a <canvas>) it injects a small "Share" button.
   On click it composites the LIVE plot — the user's exact parameters and
   readouts — into a branded PNG, then offers it through the Web Share
   sheet (mobile) or as a download (desktop). Every image carries a footer
   that names the concept and points back to concepts.jenslaufer.com, so a
   shared chart is never anonymous and always links home.

   No per-simulator code: it reads the concept name from the top bar, the
   title/eyebrow from the card's section, and the readouts from .readouts
   .stat — all of which every simulator already has.
   ===================================================================== */
(function () {
  "use strict";

  var SITE = "concepts.jenslaufer.com";
  var T = {
    paper: "#faf7f1", card: "#fffdf8", ink: "#1d1a16", inkSoft: "#544e44",
    faint: "#8a8275", line: "#e2dac9", line2: "#d4cab4", accent: "#b07a1f"
  };
  var STAT = {
    green: "#1f7a5a", red: "#b23a2e", amber: "#bd8324",
    teal: "#2f6d5b", blue: "#2f5d86", violet: "#7d4a9c"
  };
  var SERIF = 'Newsreader, Georgia, "Times New Roman", serif';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

  function txt(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }

  function conceptName() {
    var b = document.querySelector(".brand b");
    return b ? txt(b) : (document.title.split("—")[0] || document.title).trim();
  }
  function conceptSlug() {
    var s = document.querySelector(".brand .sub");           // " · compounding"
    return s ? txt(s).replace(/^[·•\s]+/, "") : (location.pathname.replace(/\//g, "") || "concept");
  }
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "plot";
  }

  // --- read what a card is "about" -------------------------------------
  function cardMeta(card) {
    var sec = card.closest("section");
    return {
      eyebrow: txt(sec && sec.querySelector(".actnum")),     // "Game One · The bend"
      title: txt(sec && sec.querySelector("h2")),            // the headline
      canvas: card.querySelector("canvas"),
      stats: [].slice.call(card.querySelectorAll(".readouts .stat")).map(function (s) {
        var cls = (s.className.match(/\b(green|red|amber|teal|blue|violet)\b/) || [])[1];
        return { k: txt(s.querySelector(".k")), v: txt(s.querySelector(".v")), color: STAT[cls] || T.ink };
      })
    };
  }

  // greedy word-wrap; returns array of lines that fit maxW at the current font
  function wrap(ctx, str, maxW) {
    var words = str.split(" "), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // --- compose the share image -----------------------------------------
  function compose(meta) {
    var S = 2;                 // retina scale → crisp on every screen
    var W = 1200, P = 64, CW = W - 2 * P, gap = 26;
    var measure = document.createElement("canvas").getContext("2d");
    measure.scale(S, S);

    // title wrap (measure pass)
    measure.font = "600 42px " + SERIF;
    var titleLines = meta.title ? wrap(measure, meta.title, CW) : [];
    var titleLH = 49;

    // plot dimensions (scaled to content width, aspect from backing store)
    var cv = meta.canvas;
    var aspect = (cv.height && cv.width) ? cv.height / cv.width : 0.6;
    var plotH = Math.round(CW * aspect);

    var statH = meta.stats.length ? 78 : 0;

    // total height
    var y = P;
    y += meta.eyebrow ? 18 + 14 : 0;
    y += titleLines.length * titleLH;
    y += titleLines.length ? gap : 0;
    y += statH ? statH + gap : 0;
    y += plotH + gap;
    y += 1 + 18 + 22;          // footer rule + line
    var H = Math.round(y + P - gap);

    var out = document.createElement("canvas");
    out.width = W * S; out.height = H * S;
    var ctx = out.getContext("2d");
    ctx.scale(S, S);
    ctx.textBaseline = "alphabetic";

    // background
    ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);

    var cy = P;

    // eyebrow
    if (meta.eyebrow) {
      ctx.font = "600 13px " + MONO;
      ctx.fillStyle = T.accent;
      ctx.textAlign = "left";
      ctx.fillText(meta.eyebrow.toUpperCase(), P, cy + 13);
      cy += 18 + 14;
    }
    // title
    if (titleLines.length) {
      ctx.font = "600 42px " + SERIF;
      ctx.fillStyle = T.ink;
      for (var i = 0; i < titleLines.length; i++) {
        ctx.fillText(titleLines[i], P, cy + 36);
        cy += titleLH;
      }
      cy += gap;
    }
    // readouts
    if (statH) {
      var n = meta.stats.length, sgap = 12;
      var pw = (CW - sgap * (n - 1)) / n;
      for (var j = 0; j < n; j++) {
        var sx = P + j * (pw + sgap), s = meta.stats[j];
        roundRect(ctx, sx, cy, pw, statH, 12);
        ctx.fillStyle = T.card; ctx.fill();
        ctx.strokeStyle = T.line; ctx.lineWidth = 1; ctx.stroke();
        ctx.textAlign = "left";
        ctx.font = "600 10.5px " + MONO;
        ctx.fillStyle = T.faint;
        ctx.fillText(fit(ctx, s.k.toUpperCase(), pw - 28), sx + 14, cy + 24);
        ctx.font = "600 25px " + MONO;
        ctx.fillStyle = s.color;
        ctx.fillText(fit(ctx, s.v, pw - 28), sx + 14, cy + 56);
      }
      cy += statH + gap;
    }
    // plot — framed on a card panel for contrast
    roundRect(ctx, P, cy, CW, plotH, 14);
    ctx.fillStyle = T.card; ctx.fill();
    ctx.strokeStyle = T.line; ctx.lineWidth = 1; ctx.stroke();
    try { ctx.drawImage(cv, P, cy, CW, plotH); } catch (e) {}
    cy += plotH + gap;

    // footer
    ctx.strokeStyle = T.line2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P, cy + 0.5); ctx.lineTo(W - P, cy + 0.5); ctx.stroke();
    cy += 22;
    ctx.font = "500 15px " + MONO;
    ctx.fillStyle = T.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText(conceptName() + "  ·  " + conceptSlug(), P, cy);
    ctx.fillStyle = T.accent;
    ctx.textAlign = "right";
    ctx.fillText("play it  ·  " + SITE, W - P, cy);

    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fit(ctx, s, maxW) {           // truncate with … if too wide
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
    return s + "…";
  }

  // --- deliver ----------------------------------------------------------
  function deliver(canvas, meta, btn) {
    var idPart = (meta.canvas && meta.canvas.id) ? "-" + slugify(meta.canvas.id) : "";
    var name = slugify(conceptSlug()) + "-" + slugify(meta.eyebrow || meta.title || "plot") + idPart + ".png";
    canvas.toBlob(function (blob) {
      if (!blob) { btn.textContent = "Couldn't render"; return; }
      var file = new File([blob], name, { type: "image/png" });
      var shareData = {
        files: [file],
        title: conceptName(),
        text: conceptName() + " — " + (meta.title || "") + "  ·  https://" + SITE + location.pathname
      };
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share(shareData).then(done(btn)).catch(function (err) {
          if (err && err.name === "AbortError") { done(btn)(); return; }
          download(blob, name); done(btn)();
        });
      } else {
        download(blob, name); done(btn)();
      }
    }, "image/png");
  }
  function download(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function done(btn) {
    return function () { btn.disabled = false; btn.textContent = btn.dataset.label; };
  }

  // --- inject buttons ---------------------------------------------------
  function addButton(card) {
    var meta = cardMeta(card);
    if (!meta.canvas) return;
    var row = document.createElement("div");
    row.className = "plot-share-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "plot-share-btn";
    btn.dataset.label = "Share this plot ↗";
    btn.textContent = btn.dataset.label;
    btn.addEventListener("click", function () {
      btn.disabled = true; btn.textContent = "Rendering…";
      var doIt = function () { try { deliver(compose(cardMeta(card)), cardMeta(card), btn); } catch (e) { btn.textContent = "Couldn't render"; } };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(doIt); else doIt();
    });
    row.appendChild(btn);
    card.appendChild(row);
  }

  function init() {
    var css = document.createElement("style");
    css.textContent =
      ".plot-share-row{display:flex;justify-content:flex-end;margin:2px 2px 14px}" +
      ".plot-share-btn{font-family:" + MONO + ";font-size:11.5px;font-weight:500;letter-spacing:.04em;" +
      "cursor:pointer;border:1px solid var(--line-2,#d4cab4);background:var(--paper,#faf7f1);" +
      "color:var(--ink-faint,#8a8275);padding:6px 13px;border-radius:999px;transition:all .15s ease}" +
      ".plot-share-btn:hover{color:var(--ink,#1d1a16);border-color:var(--ink-faint,#8a8275)}" +
      ".plot-share-btn:disabled{opacity:.6;cursor:default}";
    document.head.appendChild(css);
    [].forEach.call(document.querySelectorAll(".card"), addButton);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
