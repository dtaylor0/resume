function Header() {
    return (
        <div id="Header" className="text-center h-1/8">
            <nav className="bg-altbackground shadow">
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
                    <div className="text-3xl font-bold m-2 p-3 text-accent">
                        <a href="/">Drew Taylor</a>
                    </div>
                    <div className="hidden md:flex space-x-4 text-md">
                        <a
                            href="https://www.linkedin.com/in/drew-taylor-90b188176/"
                            target="_blank"
                            className="hover:text-accent"
                        >
                            LinkedIn
                        </a>
                        <a
                            href="https://github.com/dtaylor0/"
                            target="_blank"
                            className="hover:text-accent"
                        >
                            GitHub
                        </a>
                        <a
                            href="mailto:drewtaylorm@gmail.com"
                            target="_blank"
                            className="hover:text-accent"
                        >
                            Email
                        </a>
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default Header;
