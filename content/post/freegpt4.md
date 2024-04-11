---
title: "每天簽到領取免費GPT4、Claude3免費API"
author: "鈞鈞"
description: "GPT4 、Claude3"
tags: ["AI", "影片" ]
date: "2024-04-11"
image:
  src: "/img/9_6.jpg"
  alt: "2024"
  thumbnail:
    size: "170px"
    borders: "rounded"
draft: false
categories:
  - 影片
---

只要在框框中輸入提示，片刻之後，一段完全符合你要求的逼真。....
<!--more-->

## 每天簽到領取免費GPT4、Claude3免費API

<br>  
</br>

<!-- <left>{{< figure src=/img/20481161.png width="400" height="225" >}}</left> 
-->



<a href="/img/9_6.jpg" data-lightbox="image-1" data-title="我的图片">
    <img src="/img/9_6.jpg" width="80%" alt="图片描述">
</a>


<br>  
</br>


#### 進入網站

 
 **頭頂冒火** **【[點擊前往](https://burn.hair/register?aff=9iZ5)】** 

<br>  
</br>

1.建立令牌

<a href="/img/2_7.png" data-lightbox="image-1" data-title="我的图片">
    <img src="/img/2_7.png" width="80%" alt="图片描述">
</a>

#### API 呼叫範例
要透過API 與服務進行交雲，您需要準備適當的請求，這包括設定請求頭和請求體：

- 介面URL: https://burn.hair/v1/chat/completions

- 請求頭:應包括 Authorization: Bearer sk-您的令牌，以便系統驗證您的請求。

- 請求體範例:


 ```json
{ "model" : "gpt-3.5-turbo" , "messages" : [ { "role" : "user" , "content" : "重複我說的話：我是我，你是你。" } ] , " temperature" : 0.7 }
   
   
    
       

 ```  

請根據需要替換模型名稱或調整請求體的其他參數。

<br>  
</br>

#### Claude 模型支持

本服務同時支援Claude 模型，您可以按照以下格式進行呼叫：

```json
{ "model" : "claude-3-opus-20240229" , "max_tokens" : 1024 , "messages" : [ { "role" : "user" , "content" : "Hello, world" } ] }
   
   
   
      

 ```

<br>  
</br>

#### Midjourney 支持

- 目前，本服務尚不支援Midjourney 模式。

<br>  
</br>


#### 模型變化解釋

- 如果您發現日誌中模型名稱頻繁變動，這可能是因為您使用的是NextChat 功能，它會根據需要自動選擇最合適的模型進行回應。