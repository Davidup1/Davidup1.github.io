/* Citation data shared by the homepage versions.
 * ScholarStats.load(url) resolves to
 *   { total, hIndex, i10Index, perYear: {"2024": n, …} | null, updated, cites(title, s2id) → Promise<number|null> }.
 * Google Scholar numbers come from gs_data.json (google-scholar-stats branch);
 * papers missing there fall back to one batched Semantic Scholar request. */
(function () {
  "use strict";
  var norm = function (t) { return (t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };

  function load(url) {
    var gs = url
      ? fetch(url, { cache: "no-cache" }).then(function (r) {
          if (!r.ok) throw new Error("gs stats unavailable");
          return r.json();
        }).catch(function () { return null; })
      : Promise.resolve(null);

    return gs.then(function (data) {
      var papers = (data && data.papers) || {};
      var s2queue = [], s2timer = null;

      function flushS2() {
        var batch = s2queue; s2queue = []; s2timer = null;
        fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch.map(function (q) { return q.id; }) })
        }).then(function (r) { return r.json(); }).then(function (res) {
          batch.forEach(function (q, i) { q.resolve(Array.isArray(res) && res[i] ? res[i].citationCount : null); });
        }).catch(function () { batch.forEach(function (q) { q.resolve(null); }); });
      }

      return {
        total: data ? data.total_citations : null,
        hIndex: data ? data.h_index : null,
        i10Index: data ? data.i10_index : null,
        perYear: data && data.cites_per_year ? data.cites_per_year : null,
        updated: data ? data.updated : null,
        cites: function (title, s2id) {
          var p = papers[norm(title)];
          if (p) return Promise.resolve(p.citations);
          if (!s2id) return Promise.resolve(null);
          return new Promise(function (resolve) {
            s2queue.push({ id: s2id, resolve: resolve });
            if (!s2timer) s2timer = setTimeout(flushS2, 0);
          });
        }
      };
    });
  }

  window.ScholarStats = { load: load };
})();
