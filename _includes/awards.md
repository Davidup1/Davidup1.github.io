<h2 id="awards" style="margin: 2px 0px -15px;">Honors & Awards</h2>

<ul style="margin: 20px 0 20px;">
{%- for a in site.data.honors.awards %}
  <li><b>[{{ a.date }}]</b> {{ a.title }}, {{ a.org }}</li>
{%- endfor %}
</ul>
