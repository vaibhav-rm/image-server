import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin"; // Init app

export async function GET() {
    try {
        const db = getFirestore();

        // 1. Parallel Count Aggregations
        const [memoriesSnapshot, usersSnapshot, requestsSnapshot] = await Promise.all([
            db.collection("memories").count().get(),
            db.collection("users").count().get(),
            db.collection("access_requests").count().get()
        ]);

        // 2. Fetch Recent Logs (Simulated from recent actions)
        // We'll combine recent memories and new users to create a "log"
        const recentMemories = await db.collection("memories")
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

        const logs = recentMemories.docs.map(doc => {
            const data = doc.data();
            return {
                timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                message: `New memory uploaded: "${data.eventName || 'Untitled'}" by ${data.userEmail}`,
                type: 'upload'
            };
        });

        return NextResponse.json({
            stats: {
                memories: memoriesSnapshot.data().count,
                users: usersSnapshot.data().count,
                pending: requestsSnapshot.data().count,
                systemStatus: "ONLINE"
            },
            logs: logs
        });

    } catch (error: any) {
        console.error("Admin Stats Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
