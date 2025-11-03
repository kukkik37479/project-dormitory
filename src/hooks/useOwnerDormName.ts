import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import {
  collection, query, where, limit, onSnapshot, getDocs
} from "firebase/firestore";

export function useOwnerDormName() {
  const [name, setName] = useState("");
  const [dormId, setDormId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    let stopDorm: (() => void) | null = null;

    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (stopDorm) stopDorm();
        setName(""); setDormId(""); setLoading(false);
        return;
      }

      setLoading(true);

      // 1) โครงสร้างใหม่: ownerIds (array)
      const q1 = query(
        collection(db, "dorms"),
        where("ownerIds", "array-contains", user.uid),
        limit(1)
      );

      let qUse = q1;

      // ถ้าไม่มีผลลัพธ์ ลองโครงสร้างเก่า: ownerId (string)
      const snap1 = await getDocs(q1);
      if (snap1.empty) {
        qUse = query(
          collection(db, "dorms"),
          where("ownerId", "==", user.uid),
          limit(1)
        );
      }

      if (stopDorm) stopDorm();
      stopDorm = onSnapshot(
        qUse,
        (snap) => {
          const doc = snap.docs[0];
          const id = doc?.id ?? "";
          const n = (doc?.data()?.name as string) ?? "";
          setDormId(id);
          setName(n);
          if (id) localStorage.setItem("currentDormId", id);
          if (n) localStorage.setItem("currentDormName", n);
          setLoading(false);
        },
        (err) => {
          console.error("useOwnerDormName:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      if (stopDorm) stopDorm();
      stopAuth();
    };
  }, []);

  return { name, dormId, loading };
}
