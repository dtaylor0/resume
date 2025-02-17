'use client';

import React, { FormEvent, KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
export type Message = {
    sender: 'client' | 'server';
    text: string;
    id: string;
};

type WebsocketData = {
    text: string | undefined;
    id: string;
};

let WS_HOST = 'https://drtaylor.xyz/api/v1/ws';
let WS_PORT = 22;
if (process.env.NODE_ENV === 'development') {
    WS_HOST = 'http://127.0.0.1';
    WS_PORT = 8787;
}

function Chat() {
    const [messages, setMessages] = useState([] as Message[]);
    const updateQueue = useRef([] as WebsocketData[]);
    const isProcessing = useRef(false);

    const processQueue = () => {
        if (isProcessing.current || updateQueue.current.length === 0) {
            return;
        }

        isProcessing.current = true;
        const nextUpdate = updateQueue.current.shift()!;
        setMessages((ms) => {
            const prevMsg = ms[ms.length - 1];
            const prevText = prevMsg.text;
            if (nextUpdate.id === prevMsg.id) {
                const newMessages = ms.slice(0, -1);
                newMessages.push({
                    id: nextUpdate.id,
                    sender: 'server',
                    text: prevText + (nextUpdate.text || ''),
                });
                return newMessages;
            }
            return [...ms, { sender: 'server', text: nextUpdate.text || '', id: nextUpdate.id }];
        });
        isProcessing.current = false;
        processQueue(); // Process the next item in the queue
    };

    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]);
    const handleNewData = (newData: WebsocketData) => {
        updateQueue.current.push(newData);
        processQueue(); // Start/continue processing
    };
    const textareaRef: MutableRefObject<HTMLTextAreaElement | null> = useRef(null);
    const chatContainerRef: MutableRefObject<HTMLDivElement | null> = useRef(null);

    const ws: MutableRefObject<WebSocket | null> = useRef(null);
    useEffect(() => {
        ws.current = new WebSocket(`${WS_HOST}:${WS_PORT}`);
        ws.current.onmessage = (event) => {
            const json: WebsocketData = JSON.parse(event.data);
            console.log(json);
            handleNewData(json);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        };
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleSubmit = useCallback(
        (e: KeyboardEvent | FormEvent) => {
            e.preventDefault();

            if (messages.length > 0 && messages[messages.length - 1].sender === 'client') {
                console.log('wait for the llm to respond before sending another message.');
                return;
            }
            const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
            const prompt = promptInput.value;
            const id = crypto.randomUUID();
            setMessages((msgs) => [...msgs, { id, sender: 'client', text: prompt }]);
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(
                    JSON.stringify({
                        prompt: [prompt],
                    }),
                );

                promptInput!.value = '';
            } else {
                console.log('WebSocket is not connected');
                setMessages((msgs) => [...msgs, { id, sender: 'server', text: 'Not connected to the server.' }]);
            }
        },
        [messages],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Enter' && e.shiftKey == false) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit],
    );
    //<div id="content" className="w-[90%] md:w-[75%] lg:w-1/2 h-[80%] mx-auto my-3 px-3 md:px-12 py-5 rounded-xl bg-altbackground">
    return (
        <>
            <div
                id="content"
                className="flex flex-col w-[90%] md:w-[75%] lg:w-1/2 h-[80%] mx-auto my-3 px-3 md:px-12 py-5 rounded-xl bg-altbackground"
            >
                <div className="flex justify-between py-3 md: py-5">
                    <h2 className="md:text-2xl font-bold text-left my-1">About Me</h2>
                    <button
                        className="px-2 font-semibold bg-background border-2 border-accent rounded-lg"
                        onClick={() => {
                            if (confirm('Are you sure you want to erase the current chat history?')) {
                                setMessages([]);
                            }
                        }}
                    >
                        New Chat
                    </button>
                </div>
                <div ref={chatContainerRef} className="flex-grow overflow-y-auto scrollbar-thin">
                    <p className="overflow-hidden">
                        My name is Drew and I am a Software Engineer at Deloitte. I implement cloud solutions for commercial and federal
                        clients under the Deloitte AI & Engineering Offering. Please use the chat below to learn more about my work
                        experience.
                    </p>
                    {messages.map((msg, i) => ChatMessage(msg, i))}
                </div>
                <form id="chat-form" className="flex-grow-0 align-self-end rounded-lg flex bg-background px-3" onSubmit={handleSubmit}>
                    <textarea
                        id="prompt-input"
                        placeholder="Type your question here..."
                        className="flex-grow scrollbar-thin rounded-lg bg-inherit focus:outline-none resize-none py-1 px-3 mx-3"
                        ref={textareaRef}
                        onKeyDown={handleKeyDown}
                        inputMode="text"
                        name="prompt"
                        autoFocus
                    ></textarea>
                    <button
                        className="p-2 m-auto float-right font-semibold bg-altbackground border-2 border-accent rounded-lg"
                        id="form-button"
                        type="submit"
                    >
                        Send
                    </button>
                </form>
            </div>
        </>
    );
}

export default React.memo(Chat);
