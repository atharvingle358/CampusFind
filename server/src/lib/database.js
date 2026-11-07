import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.resolve(here, "../../data");

// One operation queue per collection
const queues = new Map();

const files = {
  users: path.join(dataDir, "users.json"),
  items: path.join(dataDir, "items.json"),
  claims: path.join(dataDir, "claims.json")
};


// Get collection file
function getFile(collection) {
  const file = files[collection];

  if (!file) {
    throw new Error(`Unknown data collection: ${collection}`);
  }

  return file;
}


// Ensure collection file exists
async function ensureFile(collection) {
  const file = getFile(collection);

  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;

    try {
      await fs.writeFile(file, "[]\n", {
        encoding: "utf8",
        flag: "wx"
      });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
    }
  }

  return file;
}


// Read collection data
async function readFile(collection) {
  const file = await ensureFile(collection);

  try {
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw || "[]");

    if (!Array.isArray(data)) {
      throw new Error(
        `${collection}.json must contain a JSON array.`
      );
    }

    return data;

  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `${collection}.json contains invalid JSON. Repair or restore the file.`
      );
    }

    throw error;
  }
}


// Atomically write collection data
async function saveFile(collection, records) {
  const file = await ensureFile(collection);

  const temp = path.join(
    dataDir,
    `${collection}.${randomUUID()}.tmp`
  );

  try {
    await fs.writeFile(
      temp,
      JSON.stringify(records, null, 2) + "\n",
      "utf8"
    );

    await fs.rename(temp, file);

  } catch (error) {
    await fs.unlink(temp).catch(() => {});
    throw error;
  }
}


// Execute operations sequentially for each collection
function enqueue(collection, operation) {
  const previous = queues.get(collection) || Promise.resolve();

  const next = previous.then(operation);

  queues.set(
    collection,
    next.catch(() => {})
  );

  return next;
}


// Perform a complete read-modify-write operation
function mutate(collection, callback) {
  return enqueue(collection, async () => {
    const records = await readFile(collection);

    const result = await callback(records);

    return result;
  });
}


// Public read function
export async function readAll(collection) {
  return enqueue(collection, () => readFile(collection));
}


// Public write function
export async function writeAll(collection, records) {
  if (!Array.isArray(records)) {
    throw new Error("Database records must be an array.");
  }

  return enqueue(collection, () =>
    saveFile(collection, records)
  );
}


// Generate unique ID
export const newId = () => randomUUID();


// Find record by ID
export async function findById(collection, id) {
  const records = await readAll(collection);

  return (
    records.find(row =>
      String(row.id ?? row._id) === String(id)
    ) || null
  );
}


// Insert new record
export async function insert(collection, record) {
  return mutate(collection, async records => {
    const now = new Date().toISOString();

    const saved = {
      ...record,
      id: record.id || record._id || newId(),
      createdAt: record.createdAt || now,
      updatedAt: now
    };

    records.push(saved);

    await saveFile(collection, records);

    return saved;
  });
}


// Update record by ID
export async function updateById(collection, id, changes) {
  return mutate(collection, async records => {
    const index = records.findIndex(row =>
      String(row.id ?? row._id) === String(id)
    );

    if (index === -1) return null;

    const updated = {
      ...records[index],
      ...changes,
      id: records[index].id ?? records[index]._id,
      updatedAt: new Date().toISOString()
    };

    records[index] = updated;

    await saveFile(collection, records);

    return updated;
  });
}


// Remove record by ID
export async function removeById(collection, id) {
  return mutate(collection, async records => {
    const remaining = records.filter(row =>
      String(row.id ?? row._id) !== String(id)
    );

    const removed = records.length - remaining.length;

    if (removed > 0) {
      await saveFile(collection, remaining);
    }

    return removed;
  });
}


// Remove records matching condition
export async function removeWhere(collection, predicate) {
  return mutate(collection, async records => {
    const remaining = records.filter(row => !predicate(row));

    const removed = records.length - remaining.length;

    if (removed > 0) {
      await saveFile(collection, remaining);
    }

    return removed;
  });
}


// Update records matching condition
export async function updateWhere(collection, predicate, changes) {
  return mutate(collection, async records => {
    let changed = 0;

    const now = new Date().toISOString();

    const updated = records.map(row => {
      if (!predicate(row)) return row;

      changed++;

      return {
        ...row,
        ...changes,
        updatedAt: now
      };
    });

    if (changed > 0) {
      await saveFile(collection, updated);
    }

    return changed;
  });
}


// Count records
export async function countWhere(
  collection,
  predicate = () => true
) {
  const records = await readAll(collection);

  return records.filter(predicate).length;
}


// Return safe public user data
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


// Return safe public item data
export function publicItem(item, includePrivate = false) {
  if (!item) return null;

  const result = {
    ...item,
    id: item.id ?? item._id,
    _id: item._id ?? item.id
  };

  // Never expose verification answer hashes
  delete result.verificationAnswerHash;

  if (!includePrivate) {
    delete result.verificationQuestion;
  }

  return result;
}
