export class String {
  // The key for this string. This should be unique within the file. You'll use
  // this key to reference this string in your code.
  key!: string;
  // A description of what this string is. This is for the benefit of the
  // translator, so they know what context this string is used in.
  description!: string;
  // An array of translations for this string. Each translation entry should be
  // unique for the language+age combination.
  values!: Array<Translation>;
}

export class Translation {
  text!: string;
  // The language code for this translation. This should be a valid ISO 639-1
  // language code, for example "en" for English or "es" for Spanish.
  lang!: string;
  // The minimum age that this translation is appropriate for. An age of 0 means
  // its appropriate for all ages. Any other age means it's only appropriate for
  // that age and up. My suggestion is to write your strings at the highest age
  // range, and rely on Get Lost to automatically translate them to lower ages.
  //
  // Some common age ranges:
  // - 0: Appropriate for all ages.
  // - 7: Simple language and themes, mild fantasy conflict, but no serious
  //   violence or distressing topics.
  // - 10: More complex storytelling, some adventure or mystery elements, light
  //   peril, but no strong violence or heavy themes.
  // - 13: Themes of adolescence, more complex moral dilemmas, some mild to
  //   moderate violence, and occasional mature themes (handled tastefully).
  // - 16: More intense themes, stronger violence, deeper emotional or
  //   philosophical storytelling, but still avoiding extreme content.
  // - 18: Unrestricted, with potential for very mature themes, strong violence,
  //   or intense psychological elements.
  age!: number;
}
