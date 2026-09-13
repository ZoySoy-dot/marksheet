/** Digits and letters that survive being read aloud or copied off a whiteboard. */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function randomId(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Public, in the share URL. ~40 bits. */
export const makeSlug = () => randomId(8);

/** Secret, proves you are the author. ~158 bits. */
export const makeEditToken = () => randomId(32);

export const SLUG_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{4,32}$/;
