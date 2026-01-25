"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  googleSignIn: async () => {},
  logOut: async () => {},
});

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
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
        // TEMPORARY FIX: Allow EVERYONE
        const ALLOW_ALL = true;

        if (ALLOW_ALL || isAdmin || userDoc.exists()) {
             
             // If User doesn't have a doc yet, create it automatically
             if (!userDoc.exists()) {
                 await setDoc(userDocRef, {
                     uid: user.uid,
                     email: user.email,
                     displayName: user.displayName,
                     photoURL: user.photoURL,
                     role: 'member', // Default role
                     joinedAt: serverTimestamp()
                 });
             }

             console.log("Welcome back.");
             router.push("/home");
        } else {
             // 2. Not a member. Check/Create Request.
             const requestRef = doc(db, "access_requests", user.uid);
             const requestDoc = await getDoc(requestRef);
             
             if (!requestDoc.exists()) {
                 await setDoc(requestRef, {
                     uid: user.uid,
                     email: user.email,
                     displayName: user.displayName,
                     photoURL: user.photoURL,
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
    await signOut(auth);
    router.push('/login');
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
          } else if (true) { // ALLOW ALL FOR NOW
               // Auto-create doc if missing and allow
               if (!userDoc.exists()) {
                     await setDoc(userDocRef, {
                        uid: currentUser!.uid,
                        email: currentUser!.email,
                        displayName: currentUser!.displayName,
                        photoURL: currentUser!.photoURL,
                        role: 'member',
                        joinedAt: serverTimestamp()
                    });
               }
               setUser(currentUser);
          } else if (isAdmin) {
               // Admin bypass: Create doc if missing and allow
               if (!userDoc.exists()) {
                     await setDoc(userDocRef, {
                        uid: currentUser!.uid,
                        email: currentUser!.email,
                        displayName: currentUser!.displayName,
                        photoURL: currentUser!.photoURL,
                        role: 'admin',
                        joinedAt: serverTimestamp()
                    });
               }
               setUser(currentUser);
          } else {
              // Even if Firebase Auth says yes, our app says wait.
              setUser(currentUser);
              if (window.location.pathname !== '/pending') {
                  router.push("/pending");
              }
          }
      } else {
          setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, googleSignIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
