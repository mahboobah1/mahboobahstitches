/** Shrinks a photo on the phone (longest side 1400px, JPEG, under ~560 KB) so uploads are small and fast. Returns base64. */
export async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  let w = Math.round(bitmap.width * scale);
  let h = Math.round(bitmap.height * scale);
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare images.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const quality = Math.max(0.5, 0.82 - attempt * 0.08);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (blob && blob.size <= 560_000) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(bin);
    }
    w = Math.round(w * 0.85);
    h = Math.round(h * 0.85);
  }
  throw new Error("That photo is too large even after shrinking. Try a different one.");
}
