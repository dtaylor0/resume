window.onload = function () {
    const promptInput = document.getElementById("prompt-input");
    promptInput.focus();
    const chat = document.getElementById("chat");
    document.addEventListener("htmx:wsAfterMessage", (_event) => {
        promptInput.value = "";
        promptInput.focus();
        chat.scrollTop = chat.scrollHeight;
    });

    document.addEventListener("htmx:wsBeforeSend", (event) => {
        const form = new FormData(event.detail.elt);
        const prompt = form.get("prompt");
        if (prompt === null || prompt.length === 0) {
            console.error("Bad prompt");
            event.preventDefault();
            return;
        }
    });

    promptInput.addEventListener("resize", () => {
        promptInput.focus();
        chat.scrollTop = chat.scrollHeight;
    });

    promptInput.addEventListener("focus", () => {
        chat.scrollTop = chat.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
    });

    promptInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const newEvent = new Event("submit", { cancelable: true });
            e.target.form.dispatchEvent(newEvent);
        }
    });
    const firstQuery =
        "Can you give me a brief summary of Drew's work experience?";
    promptInput.value = firstQuery;
};
