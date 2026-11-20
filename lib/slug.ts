// lib/slug.ts
// URL slugs that read well and share cleanly. Bangla text is first written in Latin letters (as people write
// Bangla in chats: "শেষ জামানার ফিতনা" → "shesh jamanar fitna"), because Bangla letters in a link turn into
// long %E0%A6… codes when it is copied or shared. Then everything that isn't a-z/0-9 becomes a hyphen.

const VOWELS: Record<string, string> = {
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
};
const VOWEL_SIGNS: Record<string, string> = {
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou", "ৗ": "ou",
};
const CONSONANTS: Record<string, string> = {
  "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng", "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
  "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n", "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
  "প": "p", "ফ": "f", "ব": "b", "ভ": "bh", "ম": "m", "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh",
  "স": "s", "হ": "h", "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t",
};
// Consonant + nukta (how ড়, ঢ় and য় are usually stored)
const NUKTA_FORMS: Record<string, string> = { "ড": "r", "ঢ": "rh", "য": "y" };
const NUKTA = "়";
const HASANTA = "্"; // joins consonants (no vowel in between)
const SIGNS: Record<string, string> = { "ং": "ng", "ঃ": "", "ঁ": "" };
const DIGITS = "০১২৩৪৫৬৭৮৯";

const isBengaliLetter = (ch: string | undefined) =>
  !!ch && (ch in VOWELS || ch in CONSONANTS || ch in VOWEL_SIGNS || ch in SIGNS || ch === HASANTA || ch === NUKTA);

/**
 * Bangla in Latin letters, roughly as it is spoken. A consonant's built-in "o" is said at the start of a word
 * ("তরুণদের" → "torunder"), before the word's last consonant ("জীবন" → "jibon", "বিষয়" → "bishoy"), at the
 * end of a final conjunct ("পর্ব" → "porbo", "জন্য" → "jonno") and before ং ("এবং" → "ebong"); elsewhere it
 * is dropped ("ইসলাম" → "islam", "করতে" → "korte").
 */
export function transliterateBangla(text: string): string {
  const chars = Array.from(text);
  // End index of the consonant at i (it may carry a nukta)
  const unitEnd = (i: number) => (chars[i + 1] === NUKTA ? i + 1 : i);
  let out = "";
  let vowelSeen = false; // in the current word
  let prevSound = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!isBengaliLetter(chars[i - 1])) vowelSeen = false;
    if (ch in VOWELS) {
      out += VOWELS[ch];
      vowelSeen = true;
      prevSound = "";
    } else if (ch in CONSONANTS) {
      const e = unitEnd(i);
      let sound = e > i && ch in NUKTA_FORMS ? NUKTA_FORMS[ch] : CONSONANTS[ch];
      const joined = chars[i - 1] === HASANTA;
      // য and ব after a hasanta are the ya-phala / ba-phala signs: "y"/"w" at the start of a word, otherwise
      // they double the consonant before them ("জন্য" → "jonno", "গুরুত্ব" → "gurutto"); ব after র is a plain "b"
      if (joined && ch === "য") sound = vowelSeen ? (prevSound.length === 1 ? prevSound : "") : "y";
      if (joined && ch === "ব" && chars[i - 2] !== "র") sound = vowelSeen ? (prevSound.length === 1 ? prevSound : "") : "w";
      const next = chars[e + 1];
      let vowel = "";
      if (next && next in VOWEL_SIGNS) {
        vowel = VOWEL_SIGNS[next];
        i = e + 1;
      } else if (next === HASANTA) {
        i = e + 1;
      } else {
        i = e;
        if (!isBengaliLetter(next)) vowel = joined ? "o" : ""; // end of the word
        else if (next in SIGNS) vowel = "o";
        else if (!vowelSeen) vowel = "o";
        else if (next in CONSONANTS && !isBengaliLetter(chars[unitEnd(e + 1) + 1])) vowel = "o"; // before the last consonant
      }
      out += sound + vowel;
      if (vowel) vowelSeen = true;
      prevSound = sound;
    } else if (ch in SIGNS) {
      out += SIGNS[ch];
    } else if (DIGITS.includes(ch)) {
      out += String(DIGITS.indexOf(ch));
    } else if (ch === "।" || ch === "॥") {
      out += " ";
    } else if (ch !== NUKTA && ch !== HASANTA) {
      out += ch;
      prevSound = "";
    }
  }
  return out;
}

/** "Islamic Halaka : শেষ জামানার ফিতনা" → "islamic-halaka-shesh-jamanar-fitna" (at most maxLength, cut at a word) */
export function slugify(text: string, { maxLength = 60, fallback = "item" }: { maxLength?: number; fallback?: string } = {}): string {
  let slug = transliterateBangla(text.normalize("NFC"))
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // é → e
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > maxLength) {
    const cut = slug.slice(0, maxLength + 1);
    slug = cut.includes("-") ? cut.slice(0, cut.lastIndexOf("-")) : slug.slice(0, maxLength);
  }
  return slug || fallback;
}
