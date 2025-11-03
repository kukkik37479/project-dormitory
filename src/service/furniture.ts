import { db } from "../firebase";
import {
  addDoc, collection, onSnapshot, orderBy, query,
  serverTimestamp, doc, updateDoc, deleteDoc
} from "firebase/firestore";

const colRoom = (d: string, r: string) =>
  collection(db, "dorms", d, "rooms", r, "furniture");

export function watchFurnitureByRoom(
  dormId: string, roomId: string, cb: (rows:any[])=>void
){
  const q = query(colRoom(dormId, roomId), orderBy("name","asc"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({id:d.id, ...d.data()}))));
}

export async function addFurniture(dormId:string, roomId:string, input:any){
  await addDoc(colRoom(dormId, roomId), {
    ...input,
    price: input.price ?? null,
    imageUrl: input.imageUrl ?? null,
    acquiredAt: input.acquiredAt ?? null,
    dormId, roomId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFurniture(d:string,r:string,id:string, partial:any){
  await updateDoc(doc(db,"dorms",d,"rooms",r,"furniture",id), {
    ...partial, updatedAt: serverTimestamp(),
  });
}

export async function deleteFurniture(d:string,r:string,id:string){
  await deleteDoc(doc(db,"dorms",d,"rooms",r,"furniture",id));
}
