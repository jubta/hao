---
title: "AI 免費搜索神器!!跟baidu/google等搜尋說再見"
author: "鈞鈞"
description: ""
tags: ["開源", "影片" ]
date: "2024-04-30"
image:
  src: "/img/P_T.png"
  alt: "2024"
  thumbnail:
    size: "170px"
    borders: "rounded"
draft: false
categories:
  - Youtube
---

為了快速啟動，這裡不需要修改任何配置，只需執行下面的 docker compose 即可....
<!--more-->

## **AI 免費搜索神器!!跟baidu/google等搜尋說再見**

<a href="/img/P_T.png " data-lightbox="image-1" data-title="我的图片">
    <img src="/img/P_T.png " width="80%" alt="图片描述">
</a>


---

<a href="/img/s_t.jpg " data-lightbox="image-1" data-title="我的图片">
    <img src="/img/s_t.jpg " width="80%" alt="图片描述">
</a>

---
1.
###### **安裝 Docker** **【[點此連結](https://docs.docker.com/get-docker/)】**


2.
- **克隆代碼**
 ```py
git clone https://github.com/yokingma/search_with_ai.git
   
 ```
---

```py
cd search_with_ai
 
 ```

<br>  
</br>

3.
- **編輯 .env 檔**

為了快速啟動，這裡不需要修改任何配置，只需執行下面的 docker compose 即可。

```py
...
# default is for docker-compose, could modify if you need.
OPENAI_KEY=freegpt35
OPENAI_PROXY_URL=http://freegpt35:3040/v1

# Local llm: Ollama hostname, could modify if you need.
OLLAMA_HOST=http://host.docker.internal:11434

# Searxng hostname, could modify if you need.
SEARXNG_HOSTNAME=http://searxng:8080
```

<br>  
</br>

- **使用 docker-compose 運行。 （無需鑰匙）**

```py
docker compose up -d
```