import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const allowedCollections = [
  "users",
  "items",
  "claims"
];

function validateCollection(collection) {
  if (!allowedCollections.includes(collection)) {
    throw new Error(`Unknown collection: ${collection}`);
  }

  return collection;
}

function handleError(error) {
  if (error) {
    console.error("Supabase database error:", error);
    throw new Error(error.message || "Database operation failed.");
  }
}

function fromDatabase(row) {
  if (!row) return null;

  return {
    ...row.data,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDatabase(record) {
  const now = new Date().toISOString();

  const id = String(
    record.id || record._id || newId()
  );

  const createdAt = record.createdAt || now;

  const saved = {
    ...record,
    id,
    createdAt,
    updatedAt: now
  };

  return {
    id,
    data: saved,
    created_at: createdAt,
    updated_at: now
  };
}

// Test database connection
export async function testDatabaseConnection() {
  const { error } = await supabase
    .from("users")
    .select("id")
    .limit(1);

  if (error) {
    throw error;
  }

  console.log("Supabase database connected successfully.");

  return true;
}

// Generate unique ID
export const newId = () => randomUUID();

// Read all records
export async function readAll(collection) {
  validateCollection(collection);

  const { data, error } = await supabase
    .from(collection)
    .select("id, data, created_at, updated_at");

  handleError(error);

  return (data || []).map(fromDatabase);
}

// Replace all records
export async function writeAll(collection, records) {
  validateCollection(collection);

  if (!Array.isArray(records)) {
    throw new Error("Database records must be an array.");
  }

  const rows = records.map(toDatabase);

  const { data: existing, error: readError } = await supabase
    .from(collection)
    .select("id");

  handleError(readError);

  const existingIds = (existing || []).map(row => row.id);
  const newIds = rows.map(row => row.id);

  const idsToDelete = existingIds.filter(
    id => !newIds.includes(id)
  );

  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from(collection)
      .delete()
      .in("id", idsToDelete);

    handleError(error);
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from(collection)
      .upsert(rows, { onConflict: "id" });

    handleError(error);
  }

  return records;
}

// Find record by ID
export async function findById(collection, id) {
  validateCollection(collection);

  const { data, error } = await supabase
    .from(collection)
    .select("id, data, created_at, updated_at")
    .eq("id", String(id))
    .maybeSingle();

  handleError(error);

  return fromDatabase(data);
}

// Insert record
export async function insert(collection, record) {
  validateCollection(collection);

  const row = toDatabase(record);

  const { data, error } = await supabase
    .from(collection)
    .insert(row)
    .select("id, data, created_at, updated_at")
    .single();

  handleError(error);

  return fromDatabase(data);
}

// Update record by ID
export async function updateById(collection, id, changes) {
  validateCollection(collection);

  const existing = await findById(collection, id);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();

  const updated = {
    ...existing,
    ...changes,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now
  };

  const { data, error } = await supabase
    .from(collection)
    .update({
      data: updated,
      updated_at: now
    })
    .eq("id", String(id))
    .select("id, data, created_at, updated_at")
    .maybeSingle();

  handleError(error);

  return fromDatabase(data);
}

// Delete record by ID
export async function removeById(collection, id) {
  validateCollection(collection);

  const { data, error } = await supabase
    .from(collection)
    .delete()
    .eq("id", String(id))
    .select("id");

  handleError(error);

  return data?.length || 0;
}

// Delete matching records
export async function removeWhere(collection, predicate) {
  const records = await readAll(collection);

  const ids = records
    .filter(predicate)
    .map(record => record.id);

  if (ids.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from(collection)
    .delete()
    .in("id", ids)
    .select("id");

  handleError(error);

  return data?.length || 0;
}

// Update matching records
export async function updateWhere(collection, predicate, changes) {
  const records = await readAll(collection);

  const matching = records.filter(predicate);

  let updated = 0;

  for (const record of matching) {
    const result = await updateById(
      collection,
      record.id,
      changes
    );

    if (result) updated++;
  }

  return updated;
}

// Count matching records
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

  delete result.verificationAnswerHash;

  if (!includePrivate) {
    delete result.verificationQuestion;
  }

  return result;
}
