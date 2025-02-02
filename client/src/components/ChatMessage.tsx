export type Message = {
    sender: "client" | "server";
    text: string;
};

function ChatMessage(message: Message, index: number) {
    const color =
        message.sender === "client" ? "bg-(--accent)" : "bg-neutral-900";
    const align = message.sender === "client" ? "text-right" : "text-left";
    return (
        <div
            key={index}
            className={`m-2 p-3 text-sm rounded-lg ${color} ${align}`}
        >
            <p className="break-words"> {message.text}</p>
        </div>
    );
}

export default ChatMessage;
