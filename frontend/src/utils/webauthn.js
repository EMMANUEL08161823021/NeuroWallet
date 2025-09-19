// base64url helpers
export function bufToB64Url(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function b64UrlToBuf(b64url) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

// Prepare registration/auth options from server for navigator.credentials
export function prepPublicKeyOptions(opts) {
  const out = { ...opts };
  if (out.challenge) out.challenge = b64UrlToBuf(out.challenge);

  if (out.user && out.user.id) {
    out.user.id = b64UrlToBuf(out.user.id);
  }

  if (Array.isArray(out.allowCredentials)) {
    out.allowCredentials = out.allowCredentials.map((c) => ({
      ...c,
      id: b64UrlToBuf(c.id), // must convert from base64url to ArrayBuffer
    }));
  }

  return out;
}

// Normalize attestation result for POST
export function attestationToJSON(cred) {
  if (!cred) return null;
  return {
    id: cred.id,
    rawId: bufToB64Url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufToB64Url(cred.response.clientDataJSON),
      attestationObject: bufToB64Url(cred.response.attestationObject),
    },
    clientExtensionResults: cred.getClientExtensionResults?.() || {},
  };
}

// Normalize assertion result for POST
export function assertionToJSON(cred) {
  if (!cred) return null;
  return {
    id: cred.id,
    rawId: bufToB64Url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufToB64Url(cred.response.clientDataJSON),
      authenticatorData: bufToB64Url(cred.response.authenticatorData),
      signature: bufToB64Url(cred.response.signature),
      userHandle: cred.response.userHandle ? bufToB64Url(cred.response.userHandle) : null,
    },
    clientExtensionResults: cred.getClientExtensionResults?.() || {},
  };
}
