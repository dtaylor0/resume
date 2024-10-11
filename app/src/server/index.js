import { ChatOpenAI } from "@langchain/openai";

const express = require("express");
// import { WebSocketServer } from "ws";

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
const res = await llm.stream();

var app = express();
var expressWs = require("express-ws")(app);

app.get("/api/llm", function (req, res, next) {
    console.log("get route");
    res.end();
});

app.ws("/api/chat", function (ws, req) {
    ws.on("error", console.error);
    ws.on("message", (data) => {
        console.log("received: %s", data);
    });
    ws.send(JSON.stringify({ message: "something" }));
});

app.listen(8080, () => {
    console.log("Listening on port 8080...");
});
