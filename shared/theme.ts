const HALLOWEEN_TITLE =
  /\b(halloween|hocus pocus|halloweentown|trick['’]? ?r['’]? ?treat|samhain|nightmare before christmas|goosebumps|hotel transylvania|monster house|\bcasper\b|beetlejuice|addams family|paranorman|corpse bride|coraline|the witches|ernest scared|twitches|scary stories to tell|hubie halloween|the halloween tree|coco'?s? halloween|over the garden wall)\b/i

const CHRISTMAS_TITLE =
  /\b(christmas|x-?mas|krampus|nutcracker|\bnoel\b|nativity|nightmare before christmas|\belf\b|polar express|home alone|yuletide|\bscrooge\b|the grinch|\bklaus\b|jingle bell|white christmas|holiday inn|miracle on \d+|it's a wonderful life)\b/i

const HALLOWEEN_KEYWORDS = [
  'halloween',
  'halloween party',
  'halloween costume',
  'trick or treat',
  'trick-or-treat',
  'trick-or-treating',
  'samhain',
  "jack-o'-lantern",
  'jack o lantern',
  "all hallows' eve",
  'all hallows eve',
  'halloweentown',
  'hocus pocus',
]

const CHRISTMAS_KEYWORDS = [
  'christmas',
  'christmas eve',
  'christmas party',
  'christmas tree',
  'christmastime',
  'santa claus',
  'santa',
  'secret santa',
  'xmas',
  'nativity',
  'krampus',
  'nutcracker',
  'north pole',
  'scrooge',
  'st. nicholas',
  'saint nicholas',
  'silent night',
  'white christmas',
  'yuletide',
  'father christmas',
]

function haystack(title: string, originalTitle: string | null | undefined, keywords: string[]): string {
  return [title, originalTitle ?? '', ...keywords].join(' \n ').toLowerCase()
}

export function isHalloweenMovie(
  title: string,
  originalTitle: string | null | undefined,
  keywords: string[],
): boolean {
  if (HALLOWEEN_TITLE.test(title) || (originalTitle && HALLOWEEN_TITLE.test(originalTitle))) {
    return true
  }
  const text = haystack(title, originalTitle, keywords)
  return HALLOWEEN_KEYWORDS.some((word) => text.includes(word))
}

export function isChristmasMovie(
  title: string,
  originalTitle: string | null | undefined,
  keywords: string[],
): boolean {
  if (CHRISTMAS_TITLE.test(title) || (originalTitle && CHRISTMAS_TITLE.test(originalTitle))) {
    return true
  }
  const text = haystack(title, originalTitle, keywords)
  return CHRISTMAS_KEYWORDS.some((word) => text.includes(word))
}
