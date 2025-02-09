import Header from './Header';
import Chat from './Chat';

function App() {
    return (
        <div className="h-svh flex flex-col">
            <Header />
            <div id="content" className="w-[90%] md:w-[75%] lg:w-1/2 h-[80%] mx-auto my-3 px-3 md:px-12 py-5 rounded-xl bg-altbackground">
                <Chat />
            </div>
        </div>
    );
}

export default App;
