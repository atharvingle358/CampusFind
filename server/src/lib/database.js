import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../../data");
const queues = new Map();

const files = {
  users: path.join(dataDir, "users.json"),
  items: path.join(dataDir, "items.json"),
  claims: path.join(dataDir, "claims.json")
};

async function ensureFile(collection) {
  const file = files[collection];
  if (!file) throw new Error(`Unknown data collection: ${collection}`);
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, "[]\n", "utf8");
  }
  return file;
}

export async function readAll(collection) {
  const file = await ensureFile(collection);
  try {
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${collection}.json contains invalid JSON. Stop the server and repair or restore that file.`);
    }
    throw error;
  }
}

export async function writeAll(collection, records) {
  const file = await ensureFile(collection);
  const previous = queues.get(collection) || Promise.resolve();
  const next = previous.then(async () => {
    const temp = `${file}.tmp`;
    await fs.writeFile(temp, JSON.stringify(records, null, 2) + "\n", "utf8");
    await fs.rename(temp, file);
  });
  queues.set(collection, next.catch(() => {}));
  await next;
}

export const newId = () => randomUUID();
export const findById = async (collection, id) =>
  (await readAll(collection)).find(row => String(row.id) === String(id)) || null;

export async function insert(collection, record) {
  const rows = await readAll(collection);
  const now = new Date().toISOString();
  const saved = { id: record.id || newId(), createdAt: now, updatedAt: now, ...record };
  rows.push(saved);
  await writeAll(collection, rows);
  return saved;
}

export async function updateById(collection, id, changes) {
  const rows = await readAll(collection);
  const index = rows.findIndex(row => String(row.id) === String(id));
  if (index < 0) return null;
  rows[index] = { ...rows[index], ...changes, updatedAt: new Date().toISOString() };
  await writeAll(collection, rows);
  return rows[index];
}

export async function removeById(collection, id) {
  const rows = await readAll(collection);
  const kept = rows.filter(row => String(row.id) !== String(id));
  await writeAll(collection, kept);
  return rows.length - kept.length;
}

export async function removeWhere(collection, predicate) {
  const rows = await readAll(collection);
  const kept = rows.filter(row => !predicate(row));
  await writeAll(collection, kept);
  return rows.length - kept.length;
}

export async function updateWhere(collection, predicate, changes) {
  const rows = await readAll(collection);
  let changed = 0;
  const now = new Date().toISOString();
  const updated = rows.map(row => {
    if (!predicate(row)) return row;
    changed++;
    return { ...row, ...changes, updatedAt: now };
  });
  if (changed) await writeAll(collection, updated);
  return changed;
}

export const countWhere = async (collection, predicate = () => true) =>
  (await readAll(collection)).filter(predicate).length;


export function publicUser(user, includeEmail = false) {
  if (!user) return null;

  const result = {
    ...user,
    id: user.id ?? user._id,
    _id: user._id ?? user.id
  };

  delete result.password;
  delete result.passwordHash;

  if (!includeEmail) {
    delete result.email;
  }

  return result;
}

export function publicItem(item, includePrivate = false) {
  if (!item) return null;

  const result = {
    ...item,
    id: item.id ?? item._id,
    _id: item._id ?? item.id
  };

  if (!includePrivate) {
    delete result.verificationAnswerHash;
    delete result.verificationQuestion;
  }

  return result;
}