import Header from "./components/Header";
import Chat from "./components/Chat";

function App() {
    return (
        <div>
            <Header />
            <div className="w-1/2 flex flex-col m-auto mt-3 p-3 rounded-sm bg-(--neutral)">
                <h2 className="text-2xl p-2 text-left">About Me</h2>
                <p className="text-sm p-2">
                    Hello, my name is Drew and I am a Software Engineer at
                    Deloitte. I currently work with federal and commercial
                    clients implementing cloud solutions under Deloitte's AI &
                    Engineering Offering. Please use the chat below to learn
                    more about my work experience.
                </p>
                <Chat />
            </div>
        </div>
    );
}

export default App;
