"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile as updateAuthProfile,
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export interface Profile {
  displayName: string | null;
  photoURL: string | null;
  googlePhotoURL: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Live profile: Firestore users doc first, Firebase Auth as fallback. */
  profile: Profile | null;
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
  saveProfile: (p: { displayName?: string; photoURL?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  googleSignIn: async () => {},
  logOut: async () => {},
  saveProfile: async () => {},
});

function googlePhotoOf(u: User | null): string | null {
  if (!u) return null;
  const g = u.providerData.find((p) => p.providerId === "google");
  return g?.photoURL ?? u.photoURL;
}

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Strict Auth Check
      if (user) {
        const isAdmin = user.email === "rathodvaibhav401@gmail.com";
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        // If user is the hardcoded Admin OR exists in 'users' collection
        // OR if their email is in the 'invites' collection
        const inviteRef = doc(db, "invites", user.email!);
        const inviteDoc = await getDoc(inviteRef);

        if (isAdmin || userDoc.exists() || inviteDoc.exists()) {

             // If User doesn't have a doc yet (but is invited/admin), create it automatically
             if (!userDoc.exists()) {
                 await setDoc(userDocRef, {
                     uid: user.uid,
                     email: user.email,
                     displayName: user.displayName,
                     photoURL: user.photoURL,
                     googlePhotoURL: googlePhotoOf(user),
                     role: 'member', // Default role
                     joinedAt: serverTimestamp()
                 });
             }

             router.push("/home");
        } else {
             // 2. Not a member and Not Invited. Check/Create Request.
             const requestRef = doc(db, "access_requests", user.uid);
             const requestDoc = await getDoc(requestRef);

             if (!requestDoc.exists()) {
                 await setDoc(requestRef, {
                     uid: user.uid,
                     email: user.email,
                     displayName: user.displayName,
                     photoURL: user.photoURL,
                     googlePhotoURL: googlePhotoOf(user),
                     createdAt: serverTimestamp(),
                     status: "pending"
                 });
             }

             // 3. Redirect to Pending Page
             router.push("/pending");
        }
      }

    } catch (error) {
       console.error("Login failed", error);
       await signOut(auth);
    }
  };

  const logOut = async () => {
    setProfile(null);
    await signOut(auth);
    router.push('/login');
  };

  const saveProfile = async (p: { displayName?: string; photoURL?: string | null }) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const patch: Record<string, unknown> = {};
    if (p.displayName !== undefined) patch.displayName = p.displayName;
    if (p.photoURL !== undefined) patch.photoURL = p.photoURL;

    // Firestore doc (rules allow owners to write their own doc)
    await updateDoc(doc(db, "users", uid), patch);
    // Firebase Auth copy, so user.photoURL stays consistent too
    await updateAuthProfile(auth.currentUser, {
      ...(p.displayName !== undefined ? { displayName: p.displayName } : {}),
      ...(p.photoURL !== undefined ? { photoURL: p.photoURL } : {}),
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If user is logged in, we verify their status on every load to ensure no bans/etc
      if (currentUser) {
          const isAdmin = currentUser.email === "rathodvaibhav401@gmail.com";
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
              setUser(currentUser);
          } else if (isAdmin) {
               // Admin bypass: Create doc if missing and allow
               if (!userDoc.exists()) {
                     await setDoc(userDocRef, {
                        uid: currentUser!.uid,
                        email: currentUser!.email,
                        displayName: currentUser!.displayName,
                        photoURL: currentUser!.photoURL,
                        googlePhotoURL: googlePhotoOf(currentUser),
                        role: 'admin',
                        joinedAt: serverTimestamp()
                    });
               }
               setUser(currentUser);
          } else {
              // Check if they are invited (edge case where they logged in but doc creation failed or was deleted)
              const inviteRef = doc(db, "invites", currentUser.email!);
              const inviteDoc = await getDoc(inviteRef);

              if (inviteDoc.exists()) {
                  // Re-create user doc if missing
                   if (!userDoc.exists()) {
                     await setDoc(userDocRef, {
                        uid: currentUser!.uid,
                        email: currentUser!.email,
                        displayName: currentUser!.displayName,
                        photoURL: currentUser!.photoURL,
                        googlePhotoURL: googlePhotoOf(currentUser),
                        role: 'member',
                        joinedAt: serverTimestamp()
                    });
                   }
                   setUser(currentUser);
              } else {
                  // Not allowed.
                  // Only set user if we want them to see the pending page properly authenticated (usually yes)
                  setUser(currentUser);
                  if (window.location.pathname !== '/pending') {
                      router.push("/pending");
                  }
              }
          }
      } else {
          setUser(null);
          setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Live profile: subscribe to the users doc; fall back to Auth fields.
  useEffect(() => {
    if (!user) return;
    // Immediate fallback so UI never waits on Firestore.
    setProfile({
      displayName: user.displayName,
      photoURL: user.photoURL,
      googlePhotoURL: googlePhotoOf(user),
      email: user.email,
    });
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setProfile({
          displayName: (d.displayName as string) ?? user.displayName,
          photoURL: (d.photoURL as string) ?? user.photoURL,
          googlePhotoURL:
            (d.googlePhotoURL as string) ?? googlePhotoOf(auth.currentUser),
          email: (d.email as string) ?? user.email,
        });
      },
      () => {
        /* keep Auth fallback on permission errors */
      }
    );
    return () => unsub();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, googleSignIn, logOut, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
