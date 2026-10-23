<h2 id="services" style="margin: 2px 0px -15px;">Academic Services</h2>

<ul style="margin: 20px 0 20px;">
{%- for s in site.data.honors.services %}
  <li>{{ s.role }}: {{ s.venue }} ({{ s.short }}) {{ s.year }}</li>
{%- endfor %}
</ul>
