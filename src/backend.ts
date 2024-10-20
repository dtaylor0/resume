import { Hono } from 'hono';
// import { serveStatic } from "hono/cloudflare-workers";
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { CloudflareVectorizeStore, CloudflareWorkersAIEmbeddings } from '@langchain/cloudflare';
import { MarkdownTextSplitter } from 'langchain/text_splitter';
// import createRagChain from './llm.js';
// import { basicAuth } from "hono/basic-auth";
import { Document } from '@langchain/core/documents';
// import { RunnableSequence } from '@langchain/core/runnables';

// import { createBunWebSocket } from 'hono/bun';
//
// const { upgradeWebSocket, websocket } = createBunWebSocket();

type Bindings = {
	AI: any;
	VECTORIZE: VectorizeIndex;
};

const app = new Hono<{ Bindings: Bindings }>();
// const app = new Hono();

app.get(
	'/apiv1/ws',
	upgradeWebSocket((_c) => {
		// const upgradeHeader = c.req.header('Upgrade');
		// if (!upgradeHeader || upgradeHeader !== 'websocket') {
		// 	return c.text('Expected Upgrade: websocket', 426);
		// }
		//
		// const webSocketPair = new WebSocketPair();
		// const client = webSocketPair[0],
		// 	server = webSocketPair[1];
		//
		// server.accept();
		//
		// const upgradeResponse = new Response(null, {
		// 	status: 101,
		// 	webSocket: client,
		// });
		return {
			onMessage(event, ws) {
				console.log(`Message from client: ${event.data}`);
				ws.send('Hello from server!');
			},
			onClose: () => {
				console.log('Connection closed');
			},
			// server.addEventListener('message', (event) => {
			// 	console.log('Received: %s', event.data);
			// 	try {
			// 		const wsReq = JSON.parse(event.data as string);
			// 		if (!wsReq || !wsReq.prompt) {
			// 			console.log('No prompt found.');
			// 			server.send(JSON.stringify({ error: 'No prompt provided' }));
			// 		} else {
			// 			server.send(JSON.stringify({ response: 'Hello' }));
			// 		}
			// 		// createRagChain(c.env.VECTORIZE, c.env.AI)
			// 		// 	.then((r: RunnableSequence) => {
			// 		// 		r.invoke(wsReq.prompt).then((llmRes) => server.send(JSON.stringify({ response: llmRes })));
			// 		// 	})
			// 		// 	.catch((err: Error) => {
			// 		// 		console.error('Error in createRagChain:', err);
			// 		// 		server.send(JSON.stringify({ error: 'Internal server error' }));
			// 		// 	});
			// 	} catch (error) {
			// 		console.error('Error in WebSocket handler:', error);
			// 		server.send(JSON.stringify({ error: 'Internal server error' }));
			// 	}
			// });
			// server.addEventListener('close', (_event) => {
			// 	console.log('WebSocket closed');
			// });
			// return upgradeResponse;
		};
	}),
);
// return {
//   onMessage(event, ws) {
//     console.log("Received: %s", event.data);
//     try {
//       const wsReq = JSON.parse(event.data);
//       if (!wsReq || !wsReq.prompt) {
//         console.log("No prompt found.");
//         ws.send(JSON.stringify({ error: "No prompt provided" }));
//         return;
//       }
//       ws.send(JSON.stringify({ response: "Hello" }));
//       // Uncomment and implement error handling for createRagChain when ready
//       /* createRagChain(c.env.VECTORIZE, c.env.AI)
//           .then((r: RunnableSequence) => {
//             r.invoke(wsReq.prompt).then((llmRes) =>
//               ws.send(JSON.stringify({ response: llmRes })),
//             );
//           })
//           .catch((err: Error) => {
//             console.error("Error in createRagChain:", err);
//             ws.send(JSON.stringify({ error: "Internal server error" }));
//           }); */
//     } catch (error) {
//       console.error("Error in WebSocket handler:", error);
//       ws.send(JSON.stringify({ error: "Internal server error" }));
//     }
//   },
//   onClose: () => {
//     console.log("Connection closed.");
//   },
// };
// });

app.get('/apiv1', (c) => {
	return c.json({ response: 'hello from api' });
});

app.post(
	'/apiv1/resume',
	// async (c, next) => {
	//   const auth = basicAuth({
	//     username: c.env.USERNAME,
	//     password: c.env.PASSWORD,
	//   });
	//   return auth(c, next);
	// },
	async (c) => {
		const resume = await c.req.json();
		const ok = refreshVectorize(resume.contents, c.env.VECTORIZE, c.env.AI);
		return c.json({ ok });
	},
);

function createDocuments(text: string, chunkSize: number) {
	if (text.length < chunkSize) {
		throw new Error('Chunks cannot be larger than the input');
	}

	let documents = [];
	let lastLoaded = 0;
	while (lastLoaded < text.length - 1) {
		const start = lastLoaded + 1;
		let end = start + chunkSize;

		while (end > start && text[end] != ' ') {
			end--;
		}

		const doc = new Document({ pageContent: text.slice(start, end) });
		documents.push(doc);

		lastLoaded = end;
	}
	return documents;
}

async function refreshVectorize(contents: string, vect: VectorizeIndex, ai: Bindings['AI']) {
	const docs = createDocuments(contents, 600);
	const md_splitter = new MarkdownTextSplitter({ chunkSize: 600 });
	const splits = await md_splitter.splitDocuments(docs);

	const embeddings = new CloudflareWorkersAIEmbeddings({
		binding: ai,
		model: '@cf/baai/bge-small-en-v1.5',
	});
	const store = new CloudflareVectorizeStore(embeddings, {
		index: vect,
	});

	await store.addDocuments(splits);
}

// export default app;

export default { fetch: app.fetch };
/* export function onRequest(context: any) {
  return new Response("Hello, World");
} */
