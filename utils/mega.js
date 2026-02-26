import { supabase } from "../utils/api.js";

/**
 * Upload a file to MEGA via mux-ingest Edge Function
 * (Edge Function uses megajs with env vars)
 *
 * @param {File|Blob} file
 * @returns {Promise<string>} - Public MEGA URL
 */
export async function uploadToMega(file) {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const { data, error } = await supabase.functions.invoke("mux-ingest", {
    body: formData,
  });

  if (error) throw new Error(error.message);
  return data.url;
}
