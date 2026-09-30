import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
    const supabase = await createClient();

    const {data, error} = await supabase
        .from("class_schedule")
        .select("*");

    if (error) {
        console.error(error);
    }

    return (
        <div
            style={{
                width: "100vw",
                minHeight: "100vh",
            }}
        >
            <div
                style={{
                    width: "100vw",
                    minHeight: "100vh",
                }}
            >
                <main
                    style={{
                        minHeight: "100vh",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        background: "linear-gradient(135deg, hotpink, purple, cyan)",
                        color: "white",
                        padding: "30px",
                        boxSizing: "border-box",
                    }}
                >
                    <nav style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                        <Link href="/login">Log in</Link>
                        <Link href="/profile">Profile</Link>
                        <Link href="/members">Members</Link>
                    </nav>

                    <h1 style={{
                        fontSize: "36px",
                        fontWeight: "bold",
                        textAlign: "center",
                    }}
                    >
                        My Class Schedule Fall 2026:
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "20px",
                                alignItems: "center",
                                textAlign: "center",
                                width: "100%",
                                maxWidth: "1000px",
                                marginTop: "30px",
                            }}
                        >
                            {data?.map((course) => (
                                <div
                                    key={course.id}
                                    style={{
                                        padding: "20px",
                                        borderRadius: "16px",
                                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                                        width: "80vw",
                                        maxWidth: "1000px",
                                        fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
                                    }}
                                >
                                    <h2>{course.course_name}</h2>
                                    <p>{course.day}</p>
                                    <p>{course.time}</p>
                                    <p>{course.location}</p>
                                </div>
                            ))}
                        </div>
                    </h1>
                </main>
            </div>
        </div>
    );
}