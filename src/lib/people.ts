/**
 * How a person is referred to in the interface.
 *
 * Google hands back a full legal name. That is more than the masthead needs and
 * more than anyone wants shown on a shared screen in a library, so only the
 * first part of it is used there.
 */

/**
 * The name to greet someone by: the first word of what they are called.
 *
 * Deliberately naive about what a "first name" is, because the alternative is
 * guessing at name order across cultures and getting it confidently wrong. The
 * first word of a Google display name is what that person chose to lead with,
 * which is the best available answer.
 *
 * Returns the fallback for a name that is missing or only whitespace.
 */
export function firstName(full: string | null | undefined, fallback = "You"): string {
  if (typeof full !== "string") return fallback;
  const trimmed = full.trim();
  if (!trimmed) return fallback;
  // Split on any run of whitespace, so double spaces and tabs behave.
  const [first] = trimmed.split(/\s+/);
  return first || fallback;
}

/** The letter on a blank avatar. */
export function initial(full: string | null | undefined, fallback = "?"): string {
  const name = firstName(full, "");
  return name ? name.charAt(0).toUpperCase() : fallback;
}
