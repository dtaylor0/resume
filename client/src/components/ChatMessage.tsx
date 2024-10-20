function ChatMessage(message: string, index: number) {
	return (
		<div key={index} className="chat-message chat-item">
			<p>{message}</p>
		</div>
	);
}

export default ChatMessage;
