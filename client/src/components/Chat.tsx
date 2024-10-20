import React, { FormEvent, KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';

function Chat() {
	const [messages, setMessages] = useState([] as string[]);
	const textareaRef: MutableRefObject<HTMLTextAreaElement | null> = useRef(null);
	const chatContainerRef: MutableRefObject<HTMLDivElement | null> = useRef(null);

	const ws: MutableRefObject<WebSocket | null> = useRef(null);
	useEffect(() => {
		ws.current = new WebSocket('/apiv1/ws', 'ws');
		ws.current.onmessage = (event) => {
			const json = JSON.parse(event.data);
			console.log(json);
			setMessages((ms) => [...ms, json.response]);
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

	useEffect(() => {
		const chatContainer = chatContainerRef.current;
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}, [messages]);

	const handleSubmit = useCallback(
		(e: KeyboardEvent | FormEvent) => {
			e.preventDefault();
			if (ws.current && ws.current.readyState === WebSocket.OPEN) {
				const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
				const prompt = promptInput.value;

				ws.current.send(
					JSON.stringify({
						prompt: [...messages, prompt].join('\n\n'),
					}),
				);
				setMessages((msgs) => [...msgs, prompt]);

				promptInput!.value = '';
			} else {
				console.log('WebSocket is not connected');
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
	return (
		<>
			<div id="chat" className="chat-container" ref={chatContainerRef}>
				{messages.map((msg, i) => ChatMessage(msg, i))}
				<div id="input-bubble">
					<form id="chat-form" className="chat-item" onSubmit={handleSubmit}>
						<div className="form-container">
							<textarea id="prompt-input" ref={textareaRef} onKeyDown={handleKeyDown} inputMode="text" name="prompt" autoFocus></textarea>
							<button id="form-button" type="submit">
								Send
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
}

export default React.memo(Chat);
