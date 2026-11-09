// Sincronización con Firebase: inicio de sesión con Google y datos en Firestore.
//
// Estructura en Firestore (una colección por usuario, solo él puede leerla; ver firestore.rules):
//   users/{uid}                 → { userName, studyLog }
//   users/{uid}/subjects/{id}   → Subject + order
//   users/{uid}/tasks/{id}      → Task
//   users/{uid}/exams/{id}      → Exam
//   users/{uid}/events/{id}     → AgendaEvent
//   users/{uid}/notes/{id}      → Note
//   users/{uid}/groups/{gid}    → { joinedAt, invite? }   (grupos de los que forma parte; invite solo si administra)
//
// Grupos (calendarios compartidos):
//   groups/{gid}                → { name, color, ownerId, createdAt }
//   groups/{gid}/members/{uid}  → { role: owner|editor|viewer, name, joinedAt, code? }
//   groups/{gid}/{subjects|tasks|exams|events|notes}/{id}   → lo mismo que en users/, compartido
//   invites/{código}            → { groupId, expires, createdBy }   (quien conoce el código puede unirse como lector)
//
// Cada cambio local se aplica al momento en el store y además se escribe en Firestore. Firestore guarda
// una copia en el dispositivo (IndexedDB), así que sin conexión los cambios esperan y se suben al volver.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  connectAuthEmulator,
  deleteUser,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  terminate,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type SnapshotMetadata,
} from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import {
  applyGroup,
  applyGroupDone,
  applyGroupList,
  applyRemote,
  dropGroup,
  getState,
  personalOnly,
  resetLocal,
  setRemote,
  subscribeStore,
  type ListKey,
  type Remote,
} from '../data/store';
import { upcomingReminders } from '../lib/reminders';
import { cleanDays, cleanEvent, cleanExam, cleanNote, cleanSubject, cleanTask } from '../data/backup';
import type { GroupMember, GroupRole, State } from '../data/types';
import { isSubjectColor } from '../data/defaults';
import { appCheckSiteKey, firebaseConfig, useEmulator, vapidKey } from './config';
import { getSyncStatus, messageFor, setSyncStatus } from './index';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let started = false;
let user: User | null = null;
let unsubs: (() => void)[] = [];
let meta: Record<string, SnapshotMetadata> = {};

export function start() {
  if (started) return;
  started = true;
  app = initializeApp(firebaseConfig);
  // App Check: Firestore solo acepta peticiones de la app de verdad (no de scripts con la configuración pública)
  if (!useEmulator && appCheckSiteKey) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  }
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
  const bootOwner = getOwner();
  const redirected = takeRedirectFlag();
  getRedirectResult(auth)
    .then(async (res) => {
      if (res) await mergeOrSignOut(res.user.uid, bootState, bootOwner);
      // Se fue a Google y ha vuelto sin sesión: avisar en lugar de no hacer nada
      else if (redirected && !auth.currentUser) setSyncStatus({ phase: 'signed-out', error: LOGIN_FAILED });
    })
    .catch(onError);

  onAuthStateChanged(auth, (u) => {
    stop();
    user = u;
    if (u) {
      // Una sesión que ya estaba abierta (por ejemplo, de antes de la 1.4.1) es la dueña de los datos locales
      if (!getOwner()) setOwner(u.uid);
      listen(u);
    }
    else setSyncStatus({ phase: 'signed-out', error: getSyncStatus().error });
  });

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

const REDIRECT_FLAG = 'nocta:login-redirect';
const LOGIN_FAILED =
  'No se ha completado el inicio de sesión. Vuelve a intentarlo abriendo Nocta directamente en el navegador (Safari o Chrome), no desde el enlace de otra app.';

function takeRedirectFlag() {
  try {
    const on = sessionStorage.getItem(REDIRECT_FLAG) === '1';
    sessionStorage.removeItem(REDIRECT_FLAG);
    return on;
  } catch {
    return false;
  }
}

async function redirectSignIn(provider: GoogleAuthProvider) {
  try {
    sessionStorage.setItem(REDIRECT_FLAG, '1');
  } catch {
    /* sin sessionStorage no se puede avisar si vuelve sin sesión */
  }
  await signInWithRedirect(auth, provider);
}

/** App instalada en la pantalla de inicio del iPhone: ahí la ventana emergente no puede devolver la sesión. */
const iosHomeScreen = () => (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function signIn() {
  start();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  if (iosHomeScreen()) return redirectSignIn(provider);
  try {
    await signInWith(() => signInWithPopup(auth, provider));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') {
      await redirectSignIn(provider);
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      setSyncStatus({ phase: 'signed-out', error: 'No se ha completado el inicio de sesión. Si elegiste tu cuenta y no ha funcionado, vuelve a intentarlo.' });
    } else {
      throw err;
    }
  }
}

/**
 * Cierra la sesión y borra de este dispositivo todo lo de la cuenta: la agenda local y la caché de Firestore.
 * Los datos siguen en la nube. Sin esto, en un dispositivo compartido la siguiente persona vería la agenda
 * anterior y, al iniciar sesión, se subiría a su cuenta.
 */
export async function signOut() {
  await disablePushHere(); // antes de cerrar la sesión: hace falta para borrar el dispositivo de la cuenta
  stop();
  user = null;
  await firebaseSignOut(auth);
  await terminate(db);
  await clearIndexedDbPersistence(db).catch(() => {}); // otra pestaña abierta la mantiene: se borra al cerrarla
  resetLocal();
  setOwner(null);
  location.reload();
}

/**
 * Borra para siempre la cuenta y todo lo que tiene en Firestore, y después limpia este dispositivo
 * como al cerrar sesión. Google pide haber iniciado sesión hace poco para borrar una cuenta.
 */
export async function deleteAccount() {
  const u = auth.currentUser;
  if (!u) return;
  const last = Date.parse(u.metadata.lastSignInTime ?? '') || 0;
  if (Date.now() - last > 4 * 60_000) await reauthenticateWithPopup(u, new GoogleAuthProvider());

  await disablePushHere();
  // Los grupos que administra se borran enteros; de los demás, sale
  for (const g of getState().groups) {
    if (g.role === 'owner') await deleteGroup(g.id);
    else await leaveGroup(g.id);
  }
  stop();
  try {
    const base = doc(db, 'users', u.uid);
    const ops: BatchOp[] = [];
    for (const name of ['tasks', 'exams', 'events', 'subjects', 'notes', 'devices', 'groups', 'groupDone']) {
      const snap = await getDocsFromServer(collection(base, name));
      snap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
    }
    const reminders = await getDocsFromServer(query(collection(db, 'reminders'), where('uid', '==', u.uid)));
    reminders.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
    ops.push((b) => b.delete(base));
    await commit(ops);
    await deleteUser(u);
  } catch (err) {
    if (auth.currentUser) listen(auth.currentUser); // no se pudo: la sesión sigue como estaba
    throw err;
  }
  user = null;
  await terminate(db);
  await clearIndexedDbPersistence(db).catch(() => {});
  resetLocal();
  setOwner(null);
  location.reload();
}

/** Cuenta a la que pertenecen los datos guardados en este dispositivo. */
const OWNER_KEY = 'nocta:cuenta';

function getOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function setOwner(uid: string | null) {
  try {
    if (uid) localStorage.setItem(OWNER_KEY, uid);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* sin almacenamiento no hay datos locales que proteger */
  }
}

/** Guarda los datos locales de antes de iniciar sesión y los junta con los de la cuenta. */
async function signInWith(login: () => Promise<UserCredential>) {
  const local = getState();
  const owner = getOwner(); // antes de iniciar sesión: después ya apuntaría a la cuenta nueva
  const cred = await login();
  await mergeOrSignOut(cred.user.uid, local, owner);
}

async function mergeOrSignOut(uid: string, local: State, owner: string | null) {
  try {
    if (owner && owner !== uid) {
      // Los datos de este dispositivo son de otra cuenta: nunca se suben. Se borran y se cargan los de esta.
      resetLocal();
      if (auth.currentUser) {
        stop();
        listen(auth.currentUser);
      }
    } else {
      await merge(uid, local);
    }
    setOwner(uid);
  } catch (err) {
    // Si no se pudieron subir los datos de este dispositivo, se cierra la sesión para poder reintentarlo
    // desde cero; si no, lo que solo estaba aquí no llegaría nunca a la cuenta.
    stop();
    user = null;
    await firebaseSignOut(auth).catch(() => {});
    if ((err as { code?: string })?.code === 'permission-denied') {
      throw Object.assign(
        new Error('No se ha podido subir a tu cuenta lo que tienes en este dispositivo, así que no se ha iniciado la sesión. Exporta una copia en Ajustes y escríbenos.'),
        { code: 'subida-rechazada' },
      );
    }
    throw err;
  }
}

/**
 * Primera vez en este dispositivo: sube lo que la cuenta aún no tiene (tareas, exámenes y asignaturas que
 * no existen en la nube). Lo que ya está en la nube se respeta. Así no se pierde nada de ningún lado.
 */
async function merge(uid: string, all: State) {
  const local = personalOnly(all); // lo de los grupos ya vive en cada grupo
  const base = doc(db, 'users', uid);
  const [tasks, exams, events, notes, subjects, profile] = await Promise.all([
    getDocsFromServer(collection(base, 'tasks')),
    getDocsFromServer(collection(base, 'exams')),
    getDocsFromServer(collection(base, 'events')),
    getDocsFromServer(collection(base, 'notes')),
    getDocsFromServer(collection(base, 'subjects')),
    getDocFromServer(base),
  ]);
  const ids = (snap: { docs: { id: string }[] }) => new Set(snap.docs.map((d) => d.id));
  const writes: [DocumentReference, DocumentData][] = [];

  const remoteTasks = ids(tasks);
  for (const t of local.tasks) if (!remoteTasks.has(t.id)) writes.push([doc(base, 'tasks', t.id), t]);
  const remoteExams = ids(exams);
  for (const e of local.exams) if (!remoteExams.has(e.id)) writes.push([doc(base, 'exams', e.id), e]);
  const remoteEvents = ids(events);
  for (const e of local.events) if (!remoteEvents.has(e.id)) writes.push([doc(base, 'events', e.id), e]);
  const remoteNotes = ids(notes);
  for (const n of local.notes) if (!remoteNotes.has(n.id)) writes.push([doc(base, 'notes', n.id), n]);
  const remoteSubjects = ids(subjects);
  local.subjects.forEach((s, order) => {
    if (!remoteSubjects.has(s.id)) writes.push([doc(base, 'subjects', s.id), { ...s, order }]);
  });
  if (!profile.exists()) writes.push([base, { userName: local.userName, studyLog: local.studyLog }]);
  else if (local.studyLog.length) {
    // Los días estudiados de los dos lados se juntan para no perder ninguna racha
    const studyLog = cleanDays([...cleanDays(profile.data()?.studyLog), ...local.studyLog]);
    writes.push([base, { studyLog }]);
  }

  await commit(writes.map(([ref, data]) => (b) => b.set(ref, data, { merge: true })));
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

  const watch = (name: 'tasks' | 'exams' | 'events' | 'notes' | 'subjects', apply: (docs: Record<string, unknown>[]) => void) =>
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
    watch('events', (docs) => applyRemote({ events: docs.flatMap((d) => cleanEvent(d) ?? []) })),
    watch('notes', (docs) => applyRemote({ notes: docs.flatMap((d) => cleanNote(d) ?? []) })),
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
        const data = snap.data();
        if (!snap.metadata.hasPendingWrites && typeof data?.userName === 'string') applyRemote({ userName: data.userName.slice(0, 40) });
        if (!snap.metadata.hasPendingWrites && data && 'studyLog' in data) applyRemote({ studyLog: cleanDays(data.studyLog) });
        updateStatus();
      },
      onError,
    ),
    onSnapshot(
      query(collection(db, 'reminders'), where('uid', '==', u.uid)),
      (snap) => {
        remoteReminders = new Map(snap.docs.map((d) => [d.id, d.data()]));
        remindersLoaded = !snap.metadata.fromCache;
        scheduleReminderSync(u.uid);
      },
      onError,
    ),
    subscribeStore(() => scheduleReminderSync(u.uid)),
    // Tareas de grupo que esta persona ha terminado (cada miembro tiene las suyas)
    onSnapshot(
      collection(base, 'groupDone'),
      (snap) => {
        if (snap.metadata.fromCache && snap.empty) return;
        const map: Record<string, string> = {};
        for (const d of snap.docs) {
          const { group, task, doneAt } = d.data();
          if (typeof group === 'string' && typeof task === 'string' && typeof doneAt === 'string' && ISO_DAY.test(doneAt)) {
            map[`${group}/${task}`] = doneAt;
          }
        }
        applyGroupDone(map);
      },
      onError,
    ),
    // Grupos de los que forma parte: se escucha cada uno mientras siga en esta lista
    onSnapshot(
      collection(base, 'groups'),
      (snap) => {
        if (snap.metadata.fromCache && snap.empty) return;
        mirror = new Map(snap.docs.map((d) => [d.id, d.data()]));
        for (const gid of mirror.keys()) if (!groupSubs.has(gid)) watchGroup(u.uid, gid);
        for (const gid of [...groupSubs.keys()]) if (!mirror.has(gid)) forgetGroup(gid);
        // Puede haber cambiado el código de invitación (está aquí, no en el grupo)
        for (const g of getState().groups) {
          const invite = cleanInvite(mirror.get(g.id)?.invite);
          if (JSON.stringify(invite) !== JSON.stringify(g.invite)) applyGroup({ ...g, invite });
        }
      },
      onError,
    ),
  );
  void refreshPush();
}

// ---------- Grupos ----------

const LIST_KEYS: ListKey[] = ['subjects', 'tasks', 'exams', 'events', 'notes'];
const CLEAN: Record<ListKey, (d: Record<string, unknown>) => unknown> = {
  subjects: cleanSubject,
  tasks: cleanTask,
  exams: cleanExam,
  events: cleanEvent,
  notes: cleanNote,
};
const ROLES: GroupRole[] = ['owner', 'editor', 'viewer'];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

let groupSubs = new Map<string, (() => void)[]>();
let mirror = new Map<string, DocumentData>();

function cleanInvite(v: unknown): { code: string; expires: number } | undefined {
  const i = v as { code?: unknown; expires?: unknown } | undefined;
  return i && typeof i.code === 'string' && typeof i.expires === 'number' && i.expires > Date.now() ? { code: i.code, expires: i.expires } : undefined;
}

/** Escucha un grupo: su ficha, sus miembros y todo lo que hay dentro. */
function watchGroup(uid: string, gid: string) {
  const g = doc(db, 'groups', gid);
  let info: { name: string; color: string; ownerId: string } | null = null;
  let members: GroupMember[] | null = null;
  const publish = () => {
    const me = members?.find((m) => m.uid === uid);
    if (!info || !members || !me) return;
    applyGroup({ id: gid, ...info, role: me.role, members, invite: me.role === 'owner' ? cleanInvite(mirror.get(gid)?.invite) : undefined });
  };
  // Sin permiso (le han sacado o se ha borrado el grupo): se olvida en este dispositivo y en su lista
  const lost = (err?: unknown) => {
    const code = (err as { code?: string } | undefined)?.code;
    if (err && code !== 'permission-denied' && code !== 'not-found') return onError(err);
    forgetGroup(gid);
    void deleteDoc(doc(db, 'users', uid, 'groups', gid)).catch(() => {});
  };
  const order = (d: Record<string, unknown>) => (typeof d.order === 'number' ? d.order : 999);
  const subs: (() => void)[] = [
    onSnapshot(
      g,
      (snap) => {
        if (!snap.exists()) {
          if (!snap.metadata.fromCache) lost();
          return;
        }
        const d = snap.data();
        info = {
          name: typeof d.name === 'string' ? d.name.slice(0, 60) : 'Grupo',
          color: typeof d.color === 'string' && isSubjectColor(d.color) ? d.color : 'subj-azul',
          ownerId: typeof d.ownerId === 'string' ? d.ownerId : '',
        };
        publish();
      },
      lost,
    ),
    onSnapshot(
      collection(g, 'members'),
      (snap) => {
        members = snap.docs.flatMap((m) => {
          const d = m.data();
          return ROLES.includes(d.role) ? [{ uid: m.id, name: typeof d.name === 'string' ? d.name.slice(0, 60) : 'Sin nombre', role: d.role as GroupRole }] : [];
        });
        if (!snap.metadata.fromCache && !members.some((m) => m.uid === uid)) return lost();
        publish();
      },
      lost,
    ),
    ...LIST_KEYS.map((key) =>
      onSnapshot(
        collection(g, key),
        (snap) => {
          if (snap.metadata.hasPendingWrites) return;
          let docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Record<string, unknown>);
          if (key === 'subjects') docs = docs.sort((a, b) => order(a) - order(b) || String(a.id).localeCompare(String(b.id)));
          applyGroupList(gid, key, docs.flatMap((d) => (CLEAN[key](d) as { group?: string } | null) ?? []));
        },
        lost,
      ),
    ),
  ];
  groupSubs.set(gid, subs);
}

function forgetGroup(gid: string) {
  groupSubs.get(gid)?.forEach((u) => u());
  groupSubs.delete(gid);
  // Las marcas de "hecha" de sus tareas ya no sirven: fuera también de la cuenta
  const mine = Object.keys(getState().groupDone).filter((k) => k.startsWith(`${gid}/`));
  if (user) for (const k of mine) void deleteDoc(doc(db, 'users', user.uid, 'groupDone', k.replace('/', '__'))).catch(() => {});
  dropGroup(gid);
}

/** Nombre con el que aparece ante los demás miembros: el de su cuenta de Google o el que puso en Ajustes. */
const myName = () => (auth.currentUser?.displayName || getState().userName || 'Sin nombre').slice(0, 60);

const needUser = () => {
  if (!auth.currentUser) throw Object.assign(new Error('Inicia sesión para usar los grupos.'), { code: 'sin-sesion' });
  return auth.currentUser;
};

// Código de invitación: 10 caracteres sin los que se confunden (0/O, 1/I/L): ~50 bits, imposible de adivinar
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_DAYS = 7;
function newCode(): string {
  const out: string[] = [];
  while (out.length < 10) {
    const [x] = crypto.getRandomValues(new Uint8Array(1));
    if (x < 248) out.push(CODE_CHARS[x % CODE_CHARS.length]); // 248 = 8 × 31: sin sesgo
  }
  return out.join('');
}

export async function createGroup(name: string, color: string): Promise<string> {
  const u = needUser();
  const g = doc(collection(db, 'groups'));
  const now = Date.now();
  await setDoc(g, { name: name.trim().slice(0, 60), color, ownerId: u.uid, createdAt: now });
  await setDoc(doc(g, 'members', u.uid), { role: 'owner', name: myName(), joinedAt: now });
  await setDoc(doc(db, 'users', u.uid, 'groups', g.id), { joinedAt: now });
  return g.id;
}

/** Entra en un grupo con un código de invitación (como lector). Devuelve el id del grupo. */
export async function joinGroup(rawCode: string): Promise<string> {
  const u = needUser();
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const invalid = () => Object.assign(new Error('Ese código no existe o ha caducado. Pide uno nuevo a quien administra el grupo.'), { code: 'codigo-invalido' });
  if (!/^[A-Z2-9]{10}$/.test(code)) throw invalid();
  const inv = await getDoc(doc(db, 'invites', code));
  const data = inv.data();
  if (!inv.exists() || typeof data?.groupId !== 'string' || !(data.expires > Date.now())) throw invalid();
  const gid = data.groupId as string;
  if (getState().groups.some((g) => g.id === gid)) return gid;
  const now = Date.now();
  await setDoc(doc(db, 'groups', gid, 'members', u.uid), { role: 'viewer', name: myName(), code, joinedAt: now });
  await setDoc(doc(db, 'users', u.uid, 'groups', gid), { joinedAt: now });
  return gid;
}

/** Nuevo código de invitación (7 días). El anterior deja de servir. */
export async function createInvite(gid: string) {
  const u = needUser();
  const old = getState().groups.find((g) => g.id === gid)?.invite;
  const code = newCode();
  const expires = Date.now() + INVITE_DAYS * 86_400_000;
  await setDoc(doc(db, 'invites', code), { groupId: gid, expires, createdBy: u.uid });
  await setDoc(doc(db, 'users', u.uid, 'groups', gid), { invite: { code, expires } }, { merge: true });
  if (old) await deleteDoc(doc(db, 'invites', old.code)).catch(() => {});
}

export async function renameGroup(gid: string, name: string, color: string) {
  needUser();
  await updateDoc(doc(db, 'groups', gid), { name: name.trim().slice(0, 60), color });
}

/** Da o quita permiso de edición a un miembro (solo quien administra). */
export async function setMemberRole(gid: string, memberUid: string, role: 'editor' | 'viewer') {
  needUser();
  await updateDoc(doc(db, 'groups', gid, 'members', memberUid), { role });
}

/** Saca a alguien del grupo. El código de invitación vigente deja de servir para que no pueda volver a entrar con él. */
export async function removeMember(gid: string, memberUid: string) {
  const u = needUser();
  await deleteDoc(doc(db, 'groups', gid, 'members', memberUid));
  const invite = getState().groups.find((g) => g.id === gid)?.invite;
  if (invite) {
    await deleteDoc(doc(db, 'invites', invite.code)).catch(() => {});
    await updateDoc(doc(db, 'users', u.uid, 'groups', gid), { invite: deleteField() }).catch(() => {});
  }
}

export async function leaveGroup(gid: string) {
  const u = needUser();
  await deleteDoc(doc(db, 'groups', gid, 'members', u.uid));
  await deleteDoc(doc(db, 'users', u.uid, 'groups', gid)).catch(() => {});
  forgetGroup(gid);
}

/** Borra el grupo con todo lo que tiene dentro (solo quien administra). */
export async function deleteGroup(gid: string) {
  const u = needUser();
  const g = doc(db, 'groups', gid);
  const invite = getState().groups.find((x) => x.id === gid)?.invite;
  // El código primero: sus reglas comprueban que el grupo sigue existiendo y es suyo
  if (invite) await deleteDoc(doc(db, 'invites', invite.code)).catch(() => {});
  const ops: BatchOp[] = [];
  for (const key of LIST_KEYS) {
    const snap = await getDocsFromServer(collection(g, key));
    snap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
  }
  // Los miembros al final (las reglas de lo anterior comprueban que sigue siendo miembro), y quien administra el último
  const members = await getDocsFromServer(collection(g, 'members'));
  members.docs.filter((d) => d.id !== u.uid).forEach((d) => ops.push((b) => b.delete(d.ref)));
  ops.push((b) => b.delete(doc(g, 'members', u.uid)));
  ops.push((b) => b.delete(g));
  await commit(ops);
  await deleteDoc(doc(db, 'users', u.uid, 'groups', gid)).catch(() => {});
  forgetGroup(gid);
}

// ---------- Recordatorios con la app cerrada ----------
//
// Cada recordatorio pendiente se guarda en reminders/{uid}_{clave} con su instante absoluto. Un proceso programado
// (scripts/reminders/send.mjs, en GitHub Actions) envía cada pocos minutos los que han vencido a los dispositivos
// de users/{uid}/devices por Firebase Cloud Messaging, y los borra (o pasa al año siguiente si son anuales).

let remoteReminders = new Map<string, DocumentData>();
let remindersLoaded = false;
let reminderTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleReminderSync(uid: string) {
  clearTimeout(reminderTimer);
  reminderTimer = setTimeout(() => void syncReminders(uid).catch(onError), 1500);
}

/** Deja en la nube exactamente los recordatorios pendientes de los datos actuales. */
async function syncReminders(uid: string) {
  if (!remindersLoaded || user?.uid !== uid) return; // sin la lista real de la nube no se borra nada
  // Los vencidos hace menos de 20 min se mantienen: el envío programado puede ir unos minutos tarde
  const desired = upcomingReminders(getState(), Date.now() - 20 * 60_000);
  const want = new Map(desired.map((r) => [`${uid}_${r.key}`, r]));
  const ops: BatchOp[] = [];
  for (const [id, r] of want) {
    const cur = remoteReminders.get(id);
    const data = { uid, item: r.key, at: r.at, title: r.title.slice(0, 150), body: r.body.slice(0, 280), ...(r.yearly ? { yearly: true } : {}) };
    if (!cur || cur.at !== data.at || cur.title !== data.title || cur.body !== data.body || !!cur.yearly !== r.yearly) {
      ops.push((b) => b.set(doc(db, 'reminders', id), data));
    }
  }
  for (const id of remoteReminders.keys()) {
    if (!want.has(id)) ops.push((b) => b.delete(doc(db, 'reminders', id)));
  }
  if (ops.length) await commit(ops);
}

/** Dispositivo de este navegador registrado para recibir push (id del documento en users/{uid}/devices). */
const PUSH_KEY = 'nocta:push';

export function pushEnabledHere(): boolean {
  try {
    return !!localStorage.getItem(PUSH_KEY);
  } catch {
    return false;
  }
}

async function deviceId(token: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(hash)].slice(0, 16).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function platformName(): string {
  const ua = navigator.userAgent;
  return /Android/i.test(ua) ? 'android' : /iPhone|iPad/i.test(ua) ? 'ios' : /Windows/i.test(ua) ? 'windows' : /Mac/i.test(ua) ? 'mac' : 'otro';
}

/**
 * Registra este navegador para recibir los recordatorios por push. Devuelve null si lo consigue o el motivo:
 * 'sin-sesion', 'sin-clave' (falta vapidKey) o 'no-compatible' (p. ej. Safari de iPhone sin instalar la app).
 */
export async function enablePush(): Promise<string | null> {
  if (!user) return 'sin-sesion';
  if (!vapidKey || useEmulator) return 'sin-clave';
  if (!('serviceWorker' in navigator) || !(await isSupported())) return 'no-compatible';
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  const id = await deviceId(token);
  await setDoc(doc(db, 'users', user.uid, 'devices', id), { token, platform: platformName(), updatedAt: Date.now() });
  let old: string | null = null;
  try {
    old = localStorage.getItem(PUSH_KEY);
    localStorage.setItem(PUSH_KEY, id);
  } catch {
    /* sin almacenamiento se registra igual, pero no se recordará */
  }
  // El token cambia de vez en cuando: el dispositivo antiguo ya no sirve
  if (old && old !== id) await deleteDoc(doc(db, 'users', user.uid, 'devices', old)).catch(() => {});
  return null;
}

/** Al abrir la app con sesión: renueva el token si este navegador ya recibía push. */
async function refreshPush() {
  if (!pushEnabledHere() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  await enablePush().catch(() => {});
}

/** Este navegador deja de recibir push (al cerrar sesión o borrar la cuenta). */
async function disablePushHere() {
  let id: string | null = null;
  try {
    id = localStorage.getItem(PUSH_KEY);
    localStorage.removeItem(PUSH_KEY);
  } catch {
    return;
  }
  if (!id) return;
  if (user) await deleteDoc(doc(db, 'users', user.uid, 'devices', id)).catch(() => {});
  if (!useEmulator && vapidKey) await deleteToken(getMessaging(app)).catch(() => {});
}

function stop() {
  unsubs.forEach((u) => u());
  unsubs = [];
  meta = {};
  clearTimeout(reminderTimer);
  remoteReminders = new Map();
  remindersLoaded = false;
  groupSubs.forEach((subs) => subs.forEach((u) => u()));
  groupSubs = new Map();
  mirror = new Map();
  setRemote(null);
}

function makeRemote(base: DocumentReference): Remote {
  // Lo personal va a users/{uid}; lo de un grupo, a groups/{gid}. El campo local `group` no se guarda.
  const home = (item: { group?: string }) => (item.group ? doc(db, 'groups', item.group) : base);
  const ref = (name: string, item: { id: string; group?: string }) => doc(home(item), name, item.id);
  const strip = <T extends { group?: string }>(item: T) => {
    const copy = { ...item };
    delete copy.group;
    return copy;
  };
  // setDoc/deleteDoc se aplican al instante en la copia local; la promesa espera a que llegue al servidor.
  const send = (p: Promise<unknown>) => {
    p.then(updateStatus, onError);
    updateStatus();
  };
  const own = (name: string, id: string) => doc(base, name, id);
  return {
    // En el grupo, una tarea siempre va como pendiente: cada miembro guarda aparte si la ha terminado
    putTask: (t) => send(setDoc(ref('tasks', t), t.group ? { ...strip(t), done: false, doneAt: undefined } : strip(t))),
    removeTask: (t) => send(deleteDoc(ref('tasks', t))),
    putExam: (e) => send(setDoc(ref('exams', e), strip(e))),
    removeExam: (e) => send(deleteDoc(ref('exams', e))),
    putEvent: (e) => send(setDoc(ref('events', e), strip(e))),
    removeEvent: (e) => send(deleteDoc(ref('events', e))),
    putNote: (n) => send(setDoc(ref('notes', n), strip(n))),
    removeNote: (n) => send(deleteDoc(ref('notes', n))),
    putSubject: (sub, order) => send(setDoc(ref('subjects', sub), { ...strip(sub), order })),
    removeSubject: (sub) => send(deleteDoc(ref('subjects', sub))),
    putProfile: (p) => send(setDoc(base, p, { merge: true })),
    putStudyLog: (studyLog) => send(setDoc(base, { studyLog }, { merge: true })),
    putGroupDone: (group, task, doneAt) => {
      const d = doc(base, 'groupDone', `${group}__${task}`);
      send(doneAt ? setDoc(d, { group, task, doneAt }) : deleteDoc(d));
    },
    // Importar una copia: solo lo personal (prev y next ya vienen sin lo de los grupos)
    replaceAll: (prev, next) => {
      const ops: BatchOp[] = [];
      const keep = (list: { id: string }[]) => new Set(list.map((x) => x.id));
      for (const key of LIST_KEYS) {
        const nextIds = keep(next[key]);
        for (const x of prev[key]) if (!nextIds.has(x.id)) ops.push((b) => b.delete(own(key, x.id)));
      }
      for (const t of next.tasks) ops.push((b) => b.set(own('tasks', t.id), strip(t)));
      for (const e of next.exams) ops.push((b) => b.set(own('exams', e.id), strip(e)));
      for (const e of next.events) ops.push((b) => b.set(own('events', e.id), strip(e)));
      for (const n of next.notes) ops.push((b) => b.set(own('notes', n.id), strip(n)));
      next.subjects.forEach((sub, order) => ops.push((b) => b.set(own('subjects', sub.id), { ...strip(sub), order })));
      ops.push((b) => b.set(base, { userName: next.userName, studyLog: next.studyLog }, { merge: true }));
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
  else if (all.length < 6 || all.some((m) => m.fromCache)) phase = 'starting';
  else phase = 'synced';
  const prev = getSyncStatus();
  setSyncStatus({ phase, email, error: phase === 'synced' ? undefined : prev.error });
}

function onError(err: unknown) {
  setSyncStatus({ ...getSyncStatus(), error: messageFor(err) });
}
