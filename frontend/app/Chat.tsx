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
        <div
            id="content"
            className="flex flex-col h-full w-[95%] md:w-[80%] lg:w-[60%] mx-auto bg-altbackground border-x border-slate-400 overflow-hidden"
        >
            <div className="flex justify-between p-3 md:p-4 border-b border-slate-300">
                <h2 className="md:text-xl font-bold text-left">About Me</h2>
                <button
                    className="px-2 py-1 font-semibold bg-background border-2 border-accent rounded-lg"
                    onClick={() => {
                        if (confirm('Are you sure you want to erase the current chat history?')) {
                            setMessages([]);
                        }
                    }}
                >
                    New Chat
                </button>
            </div>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-thin p-4">
                <p className="mb-4">
                    My name is Drew and I am a Software Engineer at Deloitte. I implement cloud solutions for commercial and federal clients
                    under the Deloitte AI & Engineering Offering. Please use the chat below to learn more about my work experience.
                </p>
                {messages.map((msg, i) => Message(msg, i))}
            </div>
            <form 
                id="chat-form" 
                className="sticky bottom-0 flex items-end p-3 bg-background border-t border-slate-300 mt-auto h-[64px]" 
                onSubmit={handleSubmit}
            >
                <textarea
                    id="prompt-input"
                    placeholder="Type your question here..."
                    className="flex-1 min-h-[40px] max-h-[120px] scrollbar-thin rounded-lg bg-inherit focus:outline-none resize-none py-2 px-3"
                    ref={textareaRef}
                    onKeyDown={handleKeyDown}
                    inputMode="text"
                    name="prompt"
                    autoFocus
                    rows={1}
                ></textarea>
                <div className="w-[72px] ml-2 flex items-center justify-center">
                    {canSubmit ? (
                        <button
                            className="px-3 py-2 font-semibold bg-altbackground border-2 border-accent rounded-lg"
                            id="form-button"
                            type="submit"
                        >
                            Send
                        </button>
                    ) : (
                        <div className="w-[52px] h-[38px]"></div>
                    )}
                </div>
            </form>
        </div>
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
