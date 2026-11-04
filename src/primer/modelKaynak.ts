/**
 * Zorluk modelinin kaynağı (spec §10). scripts/yayinla.py üretir; elle değiştirmeyin.
 *
 * Model Hugging Face'ten `main` dalından DEĞİL, commit'e sabitlenmiş URL'den indirilir (CLAUDE.md).
 * Geri almak (rollback) için MODEL_COMMIT önceki commit'e çevrilir; bkz. RELEASE.md.
 */

export const MODEL_REPO = "Kubra37/se-primer-zorluk";
export const MODEL_SURUM = "v2.0.1";
export const MODEL_COMMIT = "576e42b0e833d418d13c3fe9e528e4194466b8f5";
export const MODEL_URL = "https://huggingface.co/Kubra37/se-primer-zorluk/resolve/576e42b0e833d418d13c3fe9e528e4194466b8f5/model.onnx";
export const CONFIG_URL = "https://huggingface.co/Kubra37/se-primer-zorluk/resolve/576e42b0e833d418d13c3fe9e528e4194466b8f5/config.json";
