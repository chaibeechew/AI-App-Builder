import { assessBuildQuality, BUILD_STANDARDS } from "../lib/buildStandards.js";

const MAX_SPECIFICATION_LENGTH = 60000;

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ standards: BUILD_STANDARDS, methodology: "deterministic-spec-quality-gate-v1" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const specification = req.body?.specification;
  if (!specification || typeof specification !== "object") {
    return res.status(400).json({ error: "A valid application specification is required." });
  }

  const serialized = JSON.stringify(specification);
  if (serialized.length > MAX_SPECIFICATION_LENGTH) {
    return res.status(413).json({ error: "The application specification is too large to assess." });
  }

  return res.status(200).json({ quality: assessBuildQuality(specification) });
}
