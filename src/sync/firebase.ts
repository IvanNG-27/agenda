// Sincronización con Firebase: inicio de sesión con Google y datos en Firestore.
//
// Estructura en Firestore (una colección por usuario, solo él puede leerla; ver firestore.rules):
//   users/{uid}                 → { userName }
//   users/{uid}/subjects/{id}   → Subject + order
//   users/{uid}/tasks/{id}      → Task
//   users/{uid}/exams/{id}      → Exam
//
// Cada cambio local se aplica al momento en el store y además se escribe en Firestore. Firestore guarda
// una copia en el dispositivo (IndexedDB), así que sin conexión los cambios esperan y se suben al volver.
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type SnapshotMetadata,
} from 'firebase/firestore';
import { applyRemote, getState, setRemote, type Remote } from '../data/store';
import { cleanExam, cleanSubject, cleanTask } from '../data/backup';
import type { State } from '../data/types';
import { firebaseConfig, useEmulator } from './config';
import { getSyncStatus, messageFor, setSyncStatus } from './index';

let auth: Auth;
let db: Firestore;
let started = false;
let user: User | null = null;
let unsubs: (() => void)[] = [];
let meta: Record<string, SnapshotMetadata> = {};

export function start() {
  if (started) return;
  started = true;
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });

  if (useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // Solo en pruebas: inicia sesión con una cuenta falsa del emulador, por el mismo camino que el botón real
    Object.assign(window, {
      __noctaTestSignIn: (sub: string, email: string) =>
        signInWith(() =>
          signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true }))),
        ),
    });
  }

  // Si el inicio de sesión fue por redirección, la página se ha recargado: los datos locales de antes
  // siguen en el store y se juntan con los de la nube.
  const bootState = getState();
  getRedirectResult(auth)
    .then((res) => res && mergeOrSignOut(res.user.uid, bootState))
    .catch(onError);

  onAuthStateChanged(auth, (u) => {
    stop();
    user = u;
    if (u) listen(u);
    else setSyncStatus({ phase: 'signed-out', error: getSyncStatus().error });
  });

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

export async function signIn() {
  start();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWith(() => signInWithPopup(auth, provider));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') {
      await signInWithRedirect(auth, provider);
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      setSyncStatus({ phase: 'signed-out' });
    } else {
      throw err;
    }
  }
}

export async function signOut() {
  stop();
  user = null;
  await firebaseSignOut(auth);
}

/** Guarda los datos locales de antes de iniciar sesión y los junta con los de la cuenta. */
async function signInWith(login: () => Promise<UserCredential>) {
  const local = getState();
  const cred = await login();
  await mergeOrSignOut(cred.user.uid, local);
}

async function mergeOrSignOut(uid: string, local: State) {
  try {
    await merge(uid, local);
  } catch (err) {
    // Si no se pudieron subir los datos de este dispositivo, se cierra la sesión para poder reintentarlo
    // desde cero; si no, lo que solo estaba aquí no llegaría nunca a la cuenta.
    stop();
    user = null;
    await firebaseSignOut(auth).catch(() => {});
    throw err;
  }
}

/**
 * Primera vez en este dispositivo: sube lo que la cuenta aún no tiene (tareas, exámenes y asignaturas que
 * no existen en la nube). Lo que ya está en la nube se respeta. Así no se pierde nada de ningún lado.
 */
async function merge(uid: string, local: State) {
  const base = doc(db, 'users', uid);
  const [tasks, exams, subjects, profile] = await Promise.all([
    getDocsFromServer(collection(base, 'tasks')),
    getDocsFromServer(collection(base, 'exams')),
    getDocsFromServer(collection(base, 'subjects')),
    getDocFromServer(base),
  ]);
  const ids = (snap: { docs: { id: string }[] }) => new Set(snap.docs.map((d) => d.id));
  const writes: [DocumentReference, DocumentData][] = [];

  const remoteTasks = ids(tasks);
  for (const t of local.tasks) if (!remoteTasks.has(t.id)) writes.push([doc(base, 'tasks', t.id), t]);
  const remoteExams = ids(exams);
  for (const e of local.exams) if (!remoteExams.has(e.id)) writes.push([doc(base, 'exams', e.id), e]);
  const remoteSubjects = ids(subjects);
  local.subjects.forEach((s, order) => {
    if (!remoteSubjects.has(s.id)) writes.push([doc(base, 'subjects', s.id), { ...s, order }]);
  });
  if (!profile.exists()) writes.push([base, { userName: local.userName }]);

  await commit(writes.map(([ref, data]) => (b) => b.set(ref, data)));
}

type BatchOp = (b: ReturnType<typeof writeBatch>) => void;

/** Escribe en lotes (Firestore admite hasta 500 operaciones por lote). */
async function commit(ops: BatchOp[]) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
}

function listen(u: User) {
  const base = doc(db, 'users', u.uid);
  setRemote(makeRemote(base));
  setSyncStatus({ phase: 'starting', email: u.email ?? undefined });

  const watch = (name: 'tasks' | 'exams' | 'subjects', apply: (docs: Record<string, unknown>[]) => void) =>
    onSnapshot(
      collection(base, name),
      { includeMetadataChanges: true },
      (snap) => {
        meta[name] = snap.metadata;
        // Con cambios propios aún sin confirmar, el store local ya va por delante: no se pisa.
        // Una caché vacía sin conexión tampoco borra lo que hay en pantalla.
        const skip = snap.metadata.hasPendingWrites || (snap.empty && snap.metadata.fromCache);
        if (!skip) apply(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        updateStatus();
      },
      onError,
    );

  const order = (d: Record<string, unknown>) => (typeof d.order === 'number' ? d.order : 999);

  unsubs.push(
    watch('tasks', (docs) => applyRemote({ tasks: docs.flatMap((d) => cleanTask(d) ?? []) })),
    watch('exams', (docs) => applyRemote({ exams: docs.flatMap((d) => cleanExam(d) ?? []) })),
    watch('subjects', (docs) => {
      const list = docs
        .sort((a, b) => order(a) - order(b) || String(a.id).localeCompare(String(b.id)))
        .flatMap((d) => cleanSubject(d) ?? []);
      applyRemote({ subjects: list });
    }),
    onSnapshot(
      base,
      { includeMetadataChanges: true },
      (snap) => {
        meta.profile = snap.metadata;
        const name = snap.data()?.userName;
        if (!snap.metadata.hasPendingWrites && typeof name === 'string') applyRemote({ userName: name.slice(0, 40) });
        updateStatus();
      },
      onError,
    ),
  );
}

function stop() {
  unsubs.forEach((u) => u());
  unsubs = [];
  meta = {};
  setRemote(null);
}

function makeRemote(base: DocumentReference): Remote {
  const ref = (name: string, id: string) => doc(base, name, id);
  // setDoc/deleteDoc se aplican al instante en la copia local; la promesa espera a que llegue al servidor.
  const send = (p: Promise<unknown>) => {
    p.then(updateStatus, onError);
    updateStatus();
  };
  return {
    putTask: (t) => send(setDoc(ref('tasks', t.id), t)),
    removeTask: (id) => send(deleteDoc(ref('tasks', id))),
    putExam: (e) => send(setDoc(ref('exams', e.id), e)),
    removeExam: (id) => send(deleteDoc(ref('exams', id))),
    putSubject: (s, order) => send(setDoc(ref('subjects', s.id), { ...s, order })),
    removeSubject: (id) => send(deleteDoc(ref('subjects', id))),
    putProfile: (p) => send(setDoc(base, p, { merge: true })),
    replaceAll: (prev, next) => {
      const ops: BatchOp[] = [];
      const keep = (list: { id: string }[]) => new Set(list.map((x) => x.id));
      const nextTasks = keep(next.tasks);
      const nextExams = keep(next.exams);
      const nextSubjects = keep(next.subjects);
      for (const t of prev.tasks) if (!nextTasks.has(t.id)) ops.push((b) => b.delete(ref('tasks', t.id)));
      for (const e of prev.exams) if (!nextExams.has(e.id)) ops.push((b) => b.delete(ref('exams', e.id)));
      for (const s of prev.subjects) if (!nextSubjects.has(s.id)) ops.push((b) => b.delete(ref('subjects', s.id)));
      for (const t of next.tasks) ops.push((b) => b.set(ref('tasks', t.id), t));
      for (const e of next.exams) ops.push((b) => b.set(ref('exams', e.id), e));
      next.subjects.forEach((s, order) => ops.push((b) => b.set(ref('subjects', s.id), { ...s, order })));
      ops.push((b) => b.set(base, { userName: next.userName }, { merge: true }));
      send(commit(ops));
    },
  };
}

function updateStatus() {
  if (!user) return;
  const email = user.email ?? undefined;
  const all = Object.values(meta);
  const pending = all.some((m) => m.hasPendingWrites);
  let phase: 'synced' | 'pending' | 'offline' | 'starting';
  if (!navigator.onLine) phase = 'offline';
  else if (pending) phase = 'pending';
  else if (all.length < 4 || all.some((m) => m.fromCache)) phase = 'starting';
  else phase = 'synced';
  const prev = getSyncStatus();
  setSyncStatus({ phase, email, error: phase === 'synced' ? undefined : prev.error });
}

function onError(err: unknown) {
  setSyncStatus({ ...getSyncStatus(), error: messageFor(err) });
}
