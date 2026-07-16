<h2 id="publications" style="margin: 2px 0px -15px;">Publications</h2>

<div class="publications">
<ol class="bibliography">

{% for link in site.data.publications.main %}

<li>
<div class="pub-row">
  {% if link.image %}
  <div class="col-sm-3 abbr" style="position: relative;padding-right: 15px;padding-left: 15px;">
    <img src="{{ link.image }}" class="teaser img-fluid z-depth-1" style="width=100;height=40%">
    {% if link.conference_short %} 
    <abbr class="badge">{{ link.conference_short }}</abbr>
    {% endif %}
  </div>
  {% endif %}
  <div class="col-sm-9" style="position: relative;padding-right: 15px;padding-left: 20px;">
      <div class="title"><a href="{{ link.pdf }}">{{ link.title }}</a></div>
      <div class="author">{{ link.authors }}</div>
      <div class="periodical"><em>{{ link.conference }}</em>
      </div>
    <div class="links">
      {% if link.pdf %} 
      <a href="{{ link.pdf }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">PDF</a>
      {% endif %}
      {% if link.code %} 
      <a href="{{ link.code }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Code</a>
      {% endif %}
      {% if link.page %} 
      <a href="{{ link.page }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Project Page</a>
      {% endif %}
      {% if link.bibtex %} 
      <a href="{{ link.bibtex }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">BibTex</a>
      {% endif %}
      {% if link.s2id or link.title %}
      <a href="{{ site.google_scholar }}" class="citations" data-gstitle="{{ link.title | escape }}" {% if link.s2id %}data-s2id="{{ link.s2id }}"{% endif %} target="_blank" rel="noopener"></a>
      {% endif %}
      {% if link.notes %} 
      <strong> <i style="color:#e74d3c">{{ link.notes }}</i></strong>
      {% endif %}
      {% if link.others %} 
      {{ link.others }}
      {% endif %}
    </div>
  </div>
</div>
</li>
<br>

{% endfor %}

</ol>
</div>

<script>
document.addEventListener("DOMContentLoaded", function () {
  var badges = document.querySelectorAll("a.citations");
  if (!badges.length) return;
  var GS_URL = "{{ site.google_scholar_stats }}";

  function show(b, n, tip) {
    if (typeof n === "number" && n > 0 && b.style.display !== "inline-block") {
      b.textContent = "Cited by " + n;
      if (tip) b.title = tip;
      b.style.display = "inline-block";
    }
  }
  function norm(t) { return (t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  // 兜底:Google Scholar 数据不可用(Action 未运行/被限流)时用 Semantic Scholar
  function fromSemanticScholar() {
    var pending = Array.prototype.filter.call(badges, function (b) {
      return b.style.display !== "inline-block" && b.getAttribute("data-s2id");
    });
    if (!pending.length) return;
    fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: pending.map(function (b) { return b.getAttribute("data-s2id"); }) })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!Array.isArray(data)) return;
      pending.forEach(function (b, i) {
        if (data[i]) show(b, data[i].citationCount, "Citations from Semantic Scholar");
      });
    }).catch(function () { /* citations are decorative; fail silently */ });
  }

  if (GS_URL) {
    fetch(GS_URL, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("gs stats unavailable");
      return r.json();
    }).then(function (data) {
      var papers = (data && data.papers) || {};
      badges.forEach(function (b) {
        var p = papers[norm(b.getAttribute("data-gstitle"))];
        if (p) show(b, p.citations, "Citations from Google Scholar (updated " + (data.updated || "") + ")");
      });
      fromSemanticScholar();
    }).catch(fromSemanticScholar);
  } else {
    fromSemanticScholar();
  }
});
</script>
