---
title: "ChatGPT最強的開源對手LLama2大語言模型"
author: "鈞鈞"
description: "實用軟件"
tags: ["影片", "AI"]
date: "2023-07-19"
image:
  src: "/img/52425327-90c7-46ea-ad0f-251e72a712d0.jfif"
  alt: "2023"
  thumbnail:
    size: "160px"
    borders: "rounded"
categories:
  - AI
---
是 Google Research 所推出的一項產品。它是一個基於 Jupyter Notebook
<!--more-->
### ChatGPT最強的開源對手LLama2大語言模型
{{< figure src=/img/52425327-90c7-46ea-ad0f-251e72a712d0.jfif width="80%" >}}


#### LLama AI官網

##### [點此連結](https://ai.meta.com/resources/models-and-libraries/llama/)

#### 部署體驗LLama-2-7B

Colab (全名為「Colaboratory」)調用 :

是 Google Research 所推出的一項產品。它是一個基於 Jupyter Notebook 的雲端開發環境，可以讓你透過瀏覽器編寫及執行 Python 程式碼，也可以進行資料分析及機器學習的工具，無須任何設定即可使用，並免費存取 GPU 等運算資源。同時連接到強大的 Google Cloud Platform 運行時，可以輕鬆地與他人共享您的工作並一起協同合作。




```bash
%cd /content

!apt-get -y install -qq aria2

!git clone -b v1.8 https://github.com/camenduru/text-generation-webui

%cd /content/text-generation-webui

!pip install -r requirements.txt

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/resolve/main/model-00001-of-00002.safetensors -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o model-00001-of-00002.safetensors

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/resolve/main/model-00002-of-00002.safetensors -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o model-00002-of-00002.safetensors

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/raw/main/model.safetensors.index.json -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o model.safetensors.index.json

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/raw/main/special_tokens_map.json -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o special_tokens_map.json

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/resolve/main/tokenizer.model -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o tokenizer.model

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/raw/main/tokenizer_config.json -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o tokenizer_config.json

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/raw/main/config.json -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o config.json

!aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/4bit/Llama-2-7b-chat-hf/raw/main/generation_config.json -d /content/text-generation-webui/models/Llama-2-7b-chat-hf -o generation_config.json

%cd /content/text-generation-webui

!python server.py --share --chat --model /content/text-generation-webui/models/Llama-2-7b-chat-hf

```

#### 體驗LLama-2-70B 最大模型

##### [點此連結](https://huggingface.co/chat)