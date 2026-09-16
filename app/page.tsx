export default function Home() {
    return (
        <div
            style={{
                width: "100vw",
                minHeight: "100vh",
            }}
        >
            <main
                style={{
                    minHeight: "100vh",
                    width: "100vw",
                    position: "relative",
                    overflow: "hidden",
                    background: "linear-gradient(135deg, hotpink, purple, cyan)",
                    color: "white",
                }}
            >
                <h1 className="movingText max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                    Hello World!!!
                </h1>
            </main>
        </div>
    );
}