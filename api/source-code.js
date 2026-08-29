import { createClient } from "@supabase/supabase-js";

function getSupabaseClient(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = req.headers.authorization;

  if (!url || !key) {
    throw new Error("Supabase configuration is missing.");
  }
  if (!authorization || !authorization.startsWith("Bearer ")) {
    const error = new Error("Authentication required.");
    error.status = 401;
    throw error;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}

async function requireUser(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    const authError = new Error("Authentication required.");
    authError.status = 401;
    throw authError;
  }
  return data.user;
}

function cleanPath(value) {
  return String(value || "").trim().replace(/^\/+/, "");
}

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseClient(req);
    const user = await requireUser(supabase);
    const appId = String(req.query?.app_id || req.body?.app_id || "").trim();

    if (!appId) {
      return res.status(400).json({ error: "app_id is required." });
    }

    if (req.method === "GET") {
      const includeContent = req.query?.include_content === "true";

      const { data: folders, error: folderError } = await supabase
        .from("app_folder_nodes")
        .select("id, app_id, parent_id, name, path, is_hidden, folder_type, created_at, updated_at")
        .eq("app_id", appId)
        .order("path", { ascending: true });

      if (folderError) throw folderError;

      const sourceQuery = supabase
        .from("app_source_files")
        .select(includeContent ? "id, app_id, folder_id, file_path, content, content_hash, created_at, updated_at" : "id, app_id, folder_id, file_path, content_hash, created_at, updated_at")
        .eq("app_id", appId)
        .order("file_path", { ascending: true });

      const { data: files, error: sourceError } = await sourceQuery;
      if (sourceError) throw sourceError;

      return res.status(200).json({
        app_id: appId,
        folders: folders || [],
        source_files: files || [],
        source_code_access: (files || []).length > 0 || (folders || []).some((folder) => folder.is_hidden)
          ? "buyout_enforced_by_rls"
          : "no_visible_source_code",
      });
    }

    if (req.method === "PUT") {
      const filePath = cleanPath(req.body?.file_path);
      const content = typeof req.body?.content === "string" ? req.body.content : null;
      const folderId = String(req.body?.folder_id || "").trim();

      if (!filePath || !content || !folderId) {
        return res.status(400).json({ error: "file_path, folder_id and content are required." });
      }
      if (!filePath.startsWith(".source/")) {
        return res.status(400).json({ error: "Source code must remain inside the hidden .source folder." });
      }

      const contentHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
      const hash = Array.from(new Uint8Array(contentHash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase
        .from("app_source_files")
        .upsert({
          app_id: appId,
          owner_id: user.id,
          folder_id: folderId,
          file_path: filePath,
          content,
          content_hash: hash,
          updated_at: new Date().toISOString(),
        }, { onConflict: "app_id,file_path" })
        .select("id, app_id, folder_id, file_path, content_hash, created_at, updated_at")
        .single();

      if (error) throw error;
      return res.status(200).json({ source_file: data });
    }

    if (req.method === "DELETE") {
      const filePath = cleanPath(req.query?.file_path || req.body?.file_path);
      if (!filePath || !filePath.startsWith(".source/")) {
        return res.status(400).json({ error: "A .source file_path is required." });
      }

      const { error } = await supabase
        .from("app_source_files")
        .delete()
        .eq("app_id", appId)
        .eq("file_path", filePath);

      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Source code API error:", error);
    const status = Number(error?.status) || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: error?.message || "Source code operation failed.",
    });
  }
}
