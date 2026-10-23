---
layout: homepage
---

## About Me

I am an M.S. student at the [State Key Laboratory of Networking and Switching Technology](https://sklnst.bupt.edu.cn/), Beijing University of Posts and Telecommunications (BUPT), advised by [Prof. Wenjia Xu](http://wenjia.ruantang.top/). Before that, I received my B.E. degree from the School of Information and Communication Engineering, BUPT in 2025. I am currently a research intern with the Foundation Model Team at <img src="./assets/img/logos/kuaishou.svg" alt="" style="height: 1em; vertical-align: -0.12em; margin-right: 0.15em;">[Kuaishou](https://www.kuaishou.com/).

My research focuses on intelligent interpretation of remote sensing imagery and multimodal large language models.

## Research Interests

- **Remote Sensing:** multi-temporal interpretation, change captioning, multimodal learning
- **Multimodal Large Language Models:** long-term memory, visual question answering

## News

{% for n in site.data.news %}- **[{{ n.date }}]** {{ n.text }}{% if n.emoji %} {{ n.emoji }}{% endif %}
{% endfor %}
{% include_relative _includes/publications.md %}

{% include_relative _includes/awards.md %}

{% include_relative _includes/services.md %}
