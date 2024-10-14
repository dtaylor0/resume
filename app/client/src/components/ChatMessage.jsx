function ChatMessage(message, index) {
    return (
        <div key={index} className="chat-message chat-item">
            <p>{message}</p>
        </div>
    );
}

export default ChatMessage;
