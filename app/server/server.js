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
import express from "express";
import path from "node:path";
const port = 8080;

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
const vectorStore = await FaissStore.load("./data/", new OpenAIEmbeddings());

const retriever = vectorStore.asRetriever({
    searchKwargs: { fetchK: 20 },
});

const prompt =
    PromptTemplate.fromTemplate(`Your job is to answer questions about Drew's
    resume for potential employers. Understand the context and then provide
    the relevant answer to the question. You will not answer questions which
    are unrelated to the resume, and you will not give specific estimates on
    time, age, or any similar topic. You will also reformat all your
    responses into well-formatted plaintext and no markdown. Additionally,
    you will not quote anything directly from the resume.

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

app.use(express.static(path.join(__dirname, "../../client/dist")));

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
});

app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
