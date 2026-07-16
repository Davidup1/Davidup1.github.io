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
      {% if link.s2id %}
      <a href="{{ site.google_scholar }}" class="citations" data-s2id="{{ link.s2id }}" target="_blank" rel="noopener" title="Citation count from Semantic Scholar"></a>
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
  var badges = document.querySelectorAll(".citations[data-s2id]");
  if (!badges.length) return;
  var ids = Array.prototype.map.call(badges, function (b) { return b.getAttribute("data-s2id"); });
  fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: ids })
  }).then(function (r) { return r.json(); }).then(function (data) {
    if (!Array.isArray(data)) return;
    badges.forEach(function (b, i) {
      var d = data[i];
      if (d && typeof d.citationCount === "number" && d.citationCount > 0) {
        b.textContent = "Cited by " + d.citationCount;
        b.style.display = "inline-block";
      }
    });
  }).catch(function () { /* citations are decorative; fail silently */ });
});
</script>
