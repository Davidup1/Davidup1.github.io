# 个人学术主页

基于 [Minimal Light](https://github.com/yaoyao-liu/minimal-light) 主题定制的学术主页,附带 Nerfies 风格的论文主页模板。

## 目录结构

```
_config.yml               # 全局配置:姓名、职位、单位、邮箱、各类链接、头像
index.md                  # 首页正文:About Me / Research Interests / News
_includes/publications.md # Publications 板块的渲染模板(一般不用改)
_includes/awards.md       # Honors & Awards 板块
_includes/services.md     # Academic Services 板块
_data/publications.yml    # 论文列表数据(改这里即可更新 Publications)
papers/<paper-name>/      # 每篇论文的独立主页(Nerfies 风格)
assets/img/               # 头像、favicon、论文题图
assets/files/             # CV 等 PDF 文件
```

## 内容维护

- **加一篇论文**:在 `_data/publications.yml` 顶部加一个条目,题图放到 `assets/img/`。
- **给论文建主页**:复制 `papers/example-paper/` 为 `papers/<论文名>/`,改其中的 `index.html`,再在 `publications.yml` 对应条目里加 `page: ./papers/<论文名>/`。
- **更新动态/获奖**:分别编辑 `index.md` 的 News 部分和 `_includes/awards.md`。

## 部署到 GitHub Pages

1. 在 GitHub(账号 Davidup1)新建公开仓库,命名为 `Davidup1.github.io`。
2. 推送本目录:

   ```bash
   git remote add origin git@github.com:Davidup1/Davidup1.github.io.git
   git push -u origin main
   ```

3. 仓库 Settings → Pages → Source 选择 `Deploy from a branch`,分支选 `main`(根目录)。
   GitHub 会自动用 Jekyll 构建,约一分钟后访问 `https://davidup1.github.io`。

## 本地预览

需要 Ruby 环境:

```bash
gem install jekyll
jekyll serve
# 打开 http://localhost:4000
```
