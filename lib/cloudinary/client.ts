import { v2 as cloudinary } from "cloudinary";
import { config } from "@/lib/config";

let configured = false;
export function cloudinaryClient() {
  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export async function uploadScreenshot(buf: Buffer, investigationId: string, filename: string) {
  const c = cloudinaryClient();
  const publicId = `${config.cloudinary.folder}/${investigationId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const res = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number; bytes?: number }>(
    (resolve, reject) => {
      const stream = c.uploader.upload_stream(
        { public_id: publicId, resource_type: "image", overwrite: false },
        (err, result) => (err ? reject(err) : resolve(result as never))
      );
      stream.end(buf);
    }
  );
  return { secureUrl: res.secure_url, publicId: res.public_id, width: res.width, height: res.height, bytes: res.bytes ?? buf.length };
}

export async function deleteScreenshot(publicId: string) {
  const c = cloudinaryClient();
  await c.uploader.destroy(publicId, { resource_type: "image" });
}

export function thumbnailUrl(secureUrl: string, width = 400): string {
  return secureUrl.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
