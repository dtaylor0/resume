'use client';

import React, { FormEvent, KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import Message from './Message';
export type MessageData = {
    sender: 'human' | 'ai';
    text: string;
    id: string;
};

type WebsocketData = {
    text: string | undefined;
    id: string;
    done: boolean;
};

function Chat() {
    const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || '/api/v2/ws';
    const initMsgs: MessageData[] = [];

    const [messages, setMessages] = useState(initMsgs);
    const updateQueue = useRef([] as WebsocketData[]);
    const isProcessing = useRef(false);

    useEffect(() => {
        const storedMsgs = localStorage.getItem('messages');
        if (storedMsgs) {
            const parsedMsgs = JSON.parse(storedMsgs);
            setMessages(parsedMsgs);
        }
    }, []);

    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        localStorage.setItem('messages', JSON.stringify(messages));
    }, [messages]);

    const handleNewData = (newData: WebsocketData) => {
        updateQueue.current.push(newData);
        processQueue(updateQueue, isProcessing, setMessages);
        if (newData.done) {
            setCanSubmit(true);
        }
    };
    const textareaRef: MutableRefObject<HTMLTextAreaElement | null> = useRef(null);
    const chatContainerRef: MutableRefObject<HTMLDivElement | null> = useRef(null);
    const [canSubmit, setCanSubmit] = useState(true);

    const ws: MutableRefObject<WebSocket | null> = useRef(null);
    useEffect(() => {
        ws.current = new WebSocket(WS_HOST);
        ws.current.onmessage = (event) => {
            const json: WebsocketData = JSON.parse(event.data);
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
    }, [WS_HOST]);

    const handleSubmit = useCallback(
        (e: KeyboardEvent | FormEvent) => {
            e.preventDefault();

            if (canSubmit && ws.current && ws.current.readyState === WebSocket.OPEN) {
                setCanSubmit(false);
                const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
                const prompt = promptInput.value;
                if (!prompt.trim().length) {
                    return;
                }

                promptInput!.value = '';
                const id = crypto.randomUUID();
                const newMsg: MessageData = { id, sender: 'human', text: prompt };
                ws.current.send(JSON.stringify([...messages, newMsg]));

                setMessages((msgs) => [...msgs, newMsg]);
            }
        },
        [canSubmit, setCanSubmit],
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
    return (
        <>
            <div
                id="content"
                className="flex flex-col w-[90%] md:w-[75%] lg:w-1/2 h-[80%] mx-auto my-3 px-3 md:px-12 py-5 rounded-xl bg-altbackground"
            >
                <div className="flex justify-between py-3 md:py-5">
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
                    {messages.map((msg, i) => Message(msg, i))}
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
                    {canSubmit && (
                        <button
                            className="p-2 m-auto float-right font-semibold bg-altbackground border-2 border-accent rounded-lg"
                            id="form-button"
                            type="submit"
                        >
                            Send
                        </button>
                    )}
                </form>
            </div>
        </>
    );
}

function processQueue(
    updateQueue: React.MutableRefObject<WebsocketData[]>,
    isProcessing: React.MutableRefObject<boolean>,
    setMessages: React.Dispatch<React.SetStateAction<MessageData[]>>,
) {
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
                sender: 'ai',
                text: prevText + (nextUpdate.text || ''),
            });
            return newMessages;
        }
        return [...ms, { sender: 'ai', text: nextUpdate.text || '', id: nextUpdate.id }];
    });
    isProcessing.current = false;
    processQueue(updateQueue, isProcessing, setMessages); // Process the next item in the queue
}

export default React.memo(Chat);
