function encodeBase64Url(text) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64url");
  }

  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function sanitizeShareState(state) {
  return {
    presetId: state?.presetId ?? "",
    shipName: state?.shipName ?? "",
    slotCapacities: state?.slotCapacities ?? "",
    cargoLiftMaxBoxSize: state?.cargoLiftMaxBoxSize ?? "",
    source: state?.source ?? "",
    cargoName: state?.cargoName ?? "",
    missions: Array.isArray(state?.missions)
      ? state.missions.map((mission) => ({
        id: mission?.id ?? "",
        cargoName: mission?.cargoName ?? "",
        destination: mission?.destination ?? "",
        totalSCU: mission?.totalSCU ?? "",
        deliveredSCU: mission?.deliveredSCU ?? 0
      }))
      : []
  };
}

export function encodeShareState(state) {
  const payload = JSON.stringify({
    version: 1,
    state: sanitizeShareState(state)
  });

  return encodeBase64Url(payload);
}

export function decodeShareState(encoded) {
  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    if (payload?.version !== 1 || typeof payload?.state !== "object" || !payload.state) {
      return null;
    }

    return sanitizeShareState(payload.state);
  } catch {
    return null;
  }
}

export function buildShareUrl(baseUrl, state) {
  const url = new URL(baseUrl);
  url.hash = `share=${encodeShareState(state)}`;
  return url.toString();
}

export function readShareStateFromUrl(urlLike) {
  try {
    const url = new URL(urlLike);
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const params = new URLSearchParams(hash);
    const encoded = params.get("share");
    return encoded ? decodeShareState(encoded) : null;
  } catch {
    return null;
  }
}
