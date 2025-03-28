function Header() {
    return (
        <div id="Header" className="h-full text-center overflow-hidden border-b border-slate-400">
            <nav className="bg-altbackground shadow">
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
                    <div className="text-xl font-bold my-auto text-accent">
                        <a href="/">Drew Taylor</a>
                    </div>
                    <div className="md:flex space-x-4 text-base">
                        <a href="https://www.linkedin.com/in/drew-taylor-90b188176/" target="_blank" className="hover:text-accent">
                            LinkedIn
                        </a>
                        <a href="https://github.com/dtaylor0/" target="_blank" className="hover:text-accent">
                            GitHub
                        </a>
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default Header;
