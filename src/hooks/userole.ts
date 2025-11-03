// src/hooks/useRole.ts
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

export type Role = "guest" | "owner" | "tenant";

export type RoleInfo = {
  role: Role;
  loading: boolean;
  uid?: string;
  dormId?: string;
  dormName?: string;
  roomId?: string;   // สำหรับผู้เช่า
  leaseId?: string;  // สำหรับผู้เช่า
};

export function useRole(): RoleInfo {
  const [info, setInfo] = useState<RoleInfo>({ role: "guest", loading: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setInfo({ role: "guest", loading: false });
        return;
      }

      const uid = user.uid;

      // 1) เป็นเจ้าของหอหรือไม่? (ownerIds: string[] ในเอกสาร dorms/{dormId})
      try {
        const ownerQ = query(
          collection(db, "dorms"),
          where("ownerIds", "array-contains", uid),
          limit(1)
        );
        const ownerSnap = await getDocs(ownerQ);
        if (!ownerSnap.empty) {
          const d = ownerSnap.docs[0];
          const data = d.data() as any;
          setInfo({
            role: "owner",
            loading: false,
            uid,
            dormId: d.id,
            dormName: data?.name ?? "",
          });
          return;
        }
      } catch (e) {
        console.warn("owner check failed:", e);
      }

      // 2) ถ้าไม่ใช่เจ้าของ → เป็นผู้เช่าหรือไม่? (leases ต้องมี tenantUid และ status: "active")
      try {
        const leaseQ = query(
          collectionGroup(db, "leases"),
          where("tenantUid", "==", uid),
          where("status", "==", "active"),
          limit(1)
        );
        const leaseSnap = await getDocs(leaseQ);
        if (!leaseSnap.empty) {
          const ldoc = leaseSnap.docs[0];
          const lease = ldoc.data() as any;
          const dormId = ldoc.ref.parent.parent?.id;

          let dormName: string | undefined;
          if (dormId) {
            try {
              const ddoc = await getDoc(doc(db, "dorms", dormId));
              if (ddoc.exists()) dormName = (ddoc.data() as any)?.name;
            } catch {
              /* ignore */
            }
          }

          setInfo({
            role: "tenant",
            loading: false,
            uid,
            dormId,
            dormName,
            roomId: lease?.roomId,
            leaseId: ldoc.id,
          });
          return;
        }
      } catch (e) {
        console.warn("tenant check failed:", e);
      }

      // 3) ไม่เข้าเคสใด → guest
      setInfo({ role: "guest", loading: false, uid });
    });

    return () => unsub();
  }, []);

  return info;
}

export default useRole;
