# Resume

This website uses vector embeddings of my resume content to answer natural
language questions about my work experience.

[Resume Website](https://drtaylor.xyz)

## Architecture

The website was previously built using a Go web server, a Python backend
server for the RAG + LLM, and docker compose to orchestrate. However, I
recently did a rewrite to React and Hono for Cloudflare Workers in order to
save cost on LLM tokens and avoid the AWS monthly charge for IPv4 addresses
(wtf).

## Lessons Learned

Go + Docker version was pretty simple to write but having a separate
internal Python FastAPI for the RAG + LLM was not ideal. On the other hand,
Cloudflare Workers and Pages are still not in the best spot in terms of docs,
probably due to the rapidly changing features. A particularly annoying issue
is the lack of support for websocket connections in Cloudflare Pages Functions,
which are apparently Workers anyway so somehow that Workers feature is being
broken by the networking of Pages Functions. Spent a full day figuring out that
wasn't supported since the docs do not call it out. However, Cloudflare wrangler
CLI is very nice as an easy deployment method of my Worker to the live
environment. The plug-and-play vector store and LLMs are great too.
