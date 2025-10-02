export function setHeaderSafe(reply: any, name: string, value: string) {
  try {
    if (reply?.sent) return;
    if (reply?.raw?.headersSent) return;
    reply.header(name, value);
  } catch {}
}

export function removeHeaderSafe(reply: any, name: string) {
  try {
    if (reply?.sent) return;
    reply.removeHeader?.(name);
    reply.raw?.removeHeader?.(name);
  } catch {}
}


