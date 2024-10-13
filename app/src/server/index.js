import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import {
    RunnableSequence,
    RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { configDotenv } from "dotenv";

configDotenv();
const express = require("express");
const port = 8080;

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
const vectorStore = await FaissStore.load("./data/", new OpenAIEmbeddings());

const retriever = vectorStore.asRetriever({
    searchKwargs: { fetchK: 7 },
});

const prompt =
    PromptTemplate.fromTemplate(`Answer the question based only on the following context:

{context}

Question: {question}

Answer:`);

const ragChain = RunnableSequence.from([
    {
        context: retriever.pipe((docs) =>
            docs.map((doc) => doc.pageContent).join("\n\n"),
        ),
        question: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
]);

const app = express();
require("express-ws")(app);

/* app.get("/api/llm", function (req, res, _next) {
    ragChain
        .invoke(req.query.prompt)
        .then(res.send({ response: llmRes }))
        .catch((err) => console.log(err));
}); */

app.ws("/api/ws", function (ws, _req) {
    ws.on("error", console.error);
    ws.on("message", (data) => {
        console.log("received: %s", data);
        const wsReq = JSON.parse(data);
        if (!wsReq.prompt) {
            console.log("No prompt found.");
            return;
        }
        ragChain
            .invoke(wsReq.prompt)
            .then((llmRes) => ws.send(JSON.stringify({ response: llmRes })))
            .catch((err) => console.log(err));
    });
    // ws.send(JSON.stringify({ message: "something" }));
});

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
