import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
};

function customInitApp() {
    if (getApps().length <= 0) {
        if (!firebaseAdminConfig.privateKey) {
            throw new Error("Missing FIREBASE_PRIVATE_KEY env variable");
        }
        initializeApp({
            credential: cert(firebaseAdminConfig),
            storageBucket: "dih-pics.firebasestorage.app" // explicitly set bucket name as it might not be in env
        });
    }
}

customInitApp();

export const adminStorage = getStorage();
