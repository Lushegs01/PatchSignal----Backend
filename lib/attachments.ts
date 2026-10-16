export function resolveAttachment(inv: unknown, attachmentId: string): string | null {
  const list = (inv as { attachments?: { publicId: string; secureUrl: string }[] }).attachments ?? [];
  return list.find((a) => a.publicId === attachmentId)?.secureUrl ?? null;
}
