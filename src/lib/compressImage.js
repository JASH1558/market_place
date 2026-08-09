// Resizes and re-encodes a photo in the browser before it's uploaded, so a
// full-resolution phone photo doesn't get pushed to storage untouched.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export async function compressImage(file) {
  if (!file.type.startsWith("image/")) return file;

  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    // If decoding fails for any reason, just upload the original untouched.
    return file;
  }

  const { width, height } = fitWithinMax(
    bitmap.width || bitmap.naturalWidth,
    bitmap.height || bitmap.naturalHeight,
    MAX_DIMENSION
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;

  // Only use the compressed version if it actually saved space — a tiny
  // source image or an already-compressed JPEG can come back larger.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

function loadBitmap(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fitWithinMax(width, height, max) {
  if (width <= max && height <= max) return { width, height };
  const scale = width > height ? max / width : max / height;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
