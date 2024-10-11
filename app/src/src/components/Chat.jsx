import { useEffect, useRef } from "react";

function Chat() {
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket("/api/chat");
        ws.current.onmessage = (event) => {
            const json = JSON.parse(event.data);
            console.log(json);
        };
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);
    return (
        <div id="chat" className="chat-container">
            <div className="chat-message chat-field">
                <form
                    id="chat-form"
                    className="chat-item"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (
                            ws.current &&
                            ws.current.readyState === WebSocket.OPEN
                        ) {
                            const message =
                                document.getElementById("prompt-input").value;
                            ws.current.send(JSON.stringify({ message }));
                            document.getElementById("prompt-input").value = "";
                        } else {
                            console.log("WebSocket is not connected");
                        }
                    }}
                >
                    <textarea
                        id="prompt-input"
                        inputMode="text"
                        type="text"
                        name="prompt"
                        autoFocus
                    ></textarea>
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}

export default Chat;
