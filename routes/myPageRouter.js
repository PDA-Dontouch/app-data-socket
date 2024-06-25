var express = require("express");
var router = express.Router();
const pendingOrderService = require("../service/pendingOrder/pendingOrderService.js");
const axios = require("axios");
const marketPriceService = require("../service/marketPriceOrder/marketPriceOrder");
const stockPriceService = require("../service/stockPrice/stockPrice");
const fs = require("fs");
require("dotenv").config();

router.post("/krStock", async function (req, res) {
  try {
    const stockList = req.body.stockList;
    let i = 0;
    let resultArray = [];
    // 사용 예시

    for (stockItem of stockList) {
      setTimeout(() => {}, i * 50);
      i++;

      const stockPrice = await stockPriceService.getMyPageKrStockPrice(stockItem);
      resultArray.push(stockPrice);
    }
    res.status(200).json(resultArray);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/usStock", async function (req, res) {
  try {
    const stockList = req.body.stockList;
    let i = 0;
    let resultArray = [];
    for (stockItem of stockList) {
      setTimeout(() => {}, i * 50);
      i++;

      const stockPrice = await stockPriceService.getMyPageUsStockPrice(stockItem.stockCode, stockItem.marketType);
      resultArray.push(stockPrice);
    }
    res.status(200).json(resultArray);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/stt", async function (req, res) {
  const clientId = process.env.STT_CLIENT_ID; // Application Client ID
  const clientSecret = process.env.STT_CLIENT_SECRET; // Application Client Secret
  const language = "Kor"; // 언어 코드 (Kor, Jpn, Eng, Chn)
  const apiURL = `https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=${language}`;

  try {
    const buffer = Buffer.from(req.body.base64Sound, "base64");
    const filePath = `recording${req.body.userId}.mp3`;

    fs.writeFile(filePath, buffer, async (err) => {
      if (err) {
        console.error("파일 저장 오류:", err);
      } else {
        const voiceFile = fs.readFileSync(filePath);

        const response = await axios.post(apiURL, voiceFile, {
          headers: {
            "Content-Type": "application/octet-stream",
            "X-NCP-APIGW-API-KEY-ID": clientId,
            "X-NCP-APIGW-API-KEY": clientSecret,
          },
        });

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("파일 삭제 오류:", err);
          }
        });

        return res.send(response.data.text);
      }
    });
  } catch (error) {
    if (error.response) {
      console.error("Error: " + error.response.status);
      console.error(error.response.data);
    } else {
      console.error("Exception: " + error.message);
    }
    return null;
  }
});

router.post("/json", async function (req, res) {
  class CompletionExecutor {
    constructor() {
      this.host = process.env.CHAT_HOST;
      this.apiKey = process.env.CHAT_APIKEY;
      this.apiKeyPrimaryVal = process.env.CHAT_APIKEYPRIMARYVAL;
      this.requestId = process.env.CHAT_REQUESTID;
    }

    async execute(completionRequest) {
      const headers = {
        "X-NCP-CLOVASTUDIO-API-KEY": this.apiKey,
        "X-NCP-APIGW-API-KEY": this.apiKeyPrimaryVal,
        "X-NCP-CLOVASTUDIO-REQUEST-ID": this.requestId,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "text/event-stream",
      };
      try {
        const response = await axios.post(
          `${this.host}/testapp/v1/tasks/bjleehl4/chat-completions`,
          completionRequest,
          { headers, responseType: "stream" }
        );

        //여기 부분 데이터 처리하는 부분 -----
        response.data.on("data", (chunk) => {
          const result = chunk.toString("utf-8");
          try {
            if (result) {
              const message = JSON.parse(result.split("data:")[1]);
              if (message.message.content.includes("item")) {
                console.log(message.message.content);
              }
            }
          } catch (err) {
            console.log("불가");
          }
        });
      } catch (error) {
        console.error("Error message:", error.message);
      }
    }
  }
  const completionExecutor = new CompletionExecutor();
  const presetText = [
    { role: "system", content: "" },
    { role: "user", content: req.body.text }, //여기에 사용자 메세지가 들어가야 함. 여기만 바뀌면 됨
  ];
  const requestData = {
    messages: presetText,
    topP: 0.8,
    topK: 0,
    maxTokens: 256,
    temperature: 0.5,
    repeatPenalty: 5.0,
    stopBefore: [],
    includeAiFilters: true,
    seed: 0,
  };

  completionExecutor.execute(requestData).then((data) => {});
});

module.exports = router;
