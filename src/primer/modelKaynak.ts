/**
 * Zorluk modelinin kaynağı (spec §10). scripts/yayinla.py üretir; elle değiştirmeyin.
 *
 * Model Hugging Face'ten `main` dalından DEĞİL, commit'e sabitlenmiş URL'den indirilir (CLAUDE.md).
 * Geri almak (rollback) için MODEL_COMMIT önceki commit'e çevrilir; bkz. RELEASE.md.
 */

export const MODEL_REPO = "Kubra37/se-primer-zorluk";
export const MODEL_SURUM = "v2.0";
export const MODEL_COMMIT = "28818c9b19f5ab928c1292ba930096f43def4446";
export const MODEL_URL = "https://huggingface.co/Kubra37/se-primer-zorluk/resolve/28818c9b19f5ab928c1292ba930096f43def4446/model.onnx";
export const CONFIG_URL = "https://huggingface.co/Kubra37/se-primer-zorluk/resolve/28818c9b19f5ab928c1292ba930096f43def4446/config.json";
