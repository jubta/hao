---
title: "Grok2使用流程 玩轉Grok-2！免費25美元額度"
author: "鈞鈞"
description: ""
tags: ["文章", "Grok2" ]
date: "2024-11-21"
image:
  src: "/img/gork2.JPG"
  alt: "2024"
  thumbnail:
    size: "170px"
    borders: "rounded"
draft: false
categories:

---

同時這次發佈的正式版，還提供桌面上的高級語音對話模式，內置ChatGPT 4o模型....
<!--more-->

## ** Grok2使用流程 玩轉Grok-2！免費25美元額度**

<a href="/img/gork2.JPG " data-lightbox="image-1" data-title="我的图片">
    <img src="/img/gork2.JPG " width="80%" alt="图片描述">
</a>

---

## **模型資訊**

|  模型（Model）   |  輸入（Input）  | 輸出（Output)   | 上下文長度 (Context) | 每秒請求數 (RPS) |
|  ----  | ----  | ----  | ----  | ----  |
|  grok-beta  | TEXT |  TEXT | 131072 | 60 |
|  grok-vision-beta  |  TEXT/IMAGE | TEXT | 8192 | 3 |

## **訪問地址**

Grok2公測地址：**【[https://x.ai/api](https://x.ai/api)】**

模型名稱： <font style="background: darkseagreen">groke-beta</font>、<font style="background: darkseagreen">groke-vision-beta</font>

API請求端點：<font style="background: yellow">https://api.x.ai</font>

調用工具
Chatbox   ：**【[打開連結](https://chatboxai.app/zh)】**

OneAPI     ：**【[打開連結](https://github.com/songquanpeng/one-api)】**

LibreChat：**【[打開連結](https://www.librechat.ai/)】**

1.創建 xAI 帳戶並獲取 API 密鑰

首先，訪問 xAI 控制台 https://x.ai/api 註冊帳戶。完成註冊後，前往“API 密鑰”頁面，創建新的 API 密鑰。請妥善保存該密鑰，並確保其安全性。

2.請求端點

xAI 的 API 基礎 URL 為：

<u> https://api.x.ai/v1 </u>

在此基礎上，您可以訪問不同的端點。例如，進行聊天補全的端點為：

https://api.x.ai/v1/chat/completions

3.模型名稱

Grok-2 模型的名稱為：

grok-beta

在 API 請求中，您需要在 model 參數中指定此名稱。

4.發送請求

以下是使用 curl 發送請求的示例：

curl https://api.x.ai/v1/chat/completions
-H “Content-Type: application/json”
-H “Authorization: Bearer YOUR_XAI_API_KEY”
-d ‘{
“messages”: [
{ “role”: “system”, “content”: “You are Grok, a chatbot inspired by the Hitchhikers Guide to the Galaxy.” },
{ “role”: “user”, “content”: “What is the meaning of life, the universe, and everything?” }
],
“model”: “grok-beta”,
“stream”: false,
“temperature”: 0
}’

---

**[ChatGPT 桌面版正式免費發佈！多應用交互模式讓AI接管電腦又近了一步!](https://jiun8631.vercel.app/post/chatgpt_ai/)**

**[Google Gemini 推出 iOS 版本，在 iPhone上也能免費下載](https://jiun8631.vercel.app/post/gemini/)**

**[AI 免費搜索神器!!跟baidu/google等搜尋說再見](https://jiun8631.vercel.app/post/search/)**

**[Youtube常用視頻素材 | 視頻解說](https://jiun8631.vercel.app/post/shine_vidoe/)**

**[輕鬆用上llama3-70b大模型 | 視頻解說](https://jiun8631.vercel.app/post/llama3_vidoe/)**