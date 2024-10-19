import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import {
  CloudflareVectorizeStore,
  CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import createRagChain from "@utils/llm";
import { basicAuth } from "hono/basic-auth";
import { Document } from "@langchain/core/documents";
import { RunnableSequence } from "@langchain/core/runnables";

type Bindings = {
  AI: any;
  VECTORIZE: VectorizeIndex;
  USERNAME: string;
  PASSWORD: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log("Received: %s", event.data);
        const wsReq = JSON.parse(event.data);
        if (!wsReq.prompt) {
          console.log("No prompt found.");
          ws.send(JSON.stringify({ response: "Womp" }));
          return;
        }
        createRagChain(c.env.VECTORIZE, c.env.AI)
          .then((r: RunnableSequence) => {
            r.invoke(wsReq.prompt).then((llmRes) =>
              ws.send(JSON.stringify({ response: llmRes })),
            );
          })
          .catch((err: Error) => {
            throw err;
          });
      },
      onClose: () => {
        console.log("Connection closed.");
      },
    };
  }),
);

app.get("/", (c) => {
  return c.json({ response: "hello from api" });
});

app.post(
  "/resume",
  async (c, next) => {
    const auth = basicAuth({
      username: c.env.USERNAME,
      password: c.env.PASSWORD,
    });
    return auth(c, next);
  },
  async (c) => {
    const resume = await c.req.json();
    const ok = refreshVectorize(resume.contents, c.env.VECTORIZE, c.env.AI);
    return c.json({ ok });
  },
);

function createDocuments(text: string, chunkSize: number) {
  if (text.length < chunkSize) {
    throw new Error("Chunks cannot be larger than the input");
  }

  let documents = [];
  let lastLoaded = 0;
  while (lastLoaded < text.length - 1) {
    const start = lastLoaded + 1;
    let end = start + chunkSize;

    while (end > start && text[end] != " ") {
      end--;
    }

    const doc = new Document({ pageContent: text.slice(start, end) });
    documents.push(doc);

    lastLoaded = end;
  }
  return documents;
}

async function refreshVectorize(
  contents: string,
  vect: VectorizeIndex,
  ai: Bindings["AI"],
) {
  const docs = createDocuments(contents, 600);
  const md_splitter = new MarkdownTextSplitter({ chunkSize: 600 });
  const splits = await md_splitter.splitDocuments(docs);

  const embeddings = new CloudflareWorkersAIEmbeddings({
    binding: ai,
    model: "@cf/baai/bge-small-en-v1.5",
  });
  const store = new CloudflareVectorizeStore(embeddings, {
    index: vect,
  });

  await store.addDocuments(splits);
}

// export default app;

export const onRequest = app.fetch;
