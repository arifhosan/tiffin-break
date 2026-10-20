const D = '০১২৩৪৫৬৭৮৯'

/** Bangla digits; keeps '-' and '.'. */
export const bn = (n: number): string => String(n).replace(/\d/g, (d) => D[+d])

export const strings = {
  appName: 'টিফিন ব্রেক',
  back: '← সূচিপত্র',
  bench: {
    notebook: 'খাতা',
    bookBangla: 'বাংলা বই',
    bookMath: 'গণিত বই',
    bookEnglish: 'ইংরেজি বই',
    pen: 'কলম',
    pencil: 'পেন্সিল',
    eraser: 'রাবার',
    geometry: 'জ্যামিতি বক্স',
    tiffin: 'টিফিন বক্স',
    drawMode: 'কলম হাতে নেওয়া হয়েছে',
    eraseMode: 'রাবার হাতে নেওয়া হয়েছে',
    moveHint: 'জিনিস টেনে সাজাও। কলম ছুঁলে আঁকা, রাবার ছুঁলে মোছা।',
    drawHint: 'বেঞ্চে আঁকো। কলম রাখতে আবার কলমে ছোঁও।',
    eraseHint: 'দাগের ওপর ঘষো। রাবার রাখতে আবার রাবারে ছোঁও।',
    board: 'বেঞ্চ',
  },
  // Printed and scratched art on the bench (decoration).
  art: {
    bookBangla: 'বাংলা',
    bookMath: 'গণিত',
    bookEnglish: 'English',
    grade: 'ষষ্ঠ শ্রেণি',
    carveNames: 'রাফি + মিম',
    carveYear: '২০১৩',
    carveInitial: 'স',
  },
  cover: {
    name: 'নাম',
    class: 'শ্রেণি',
    roll: 'রোল',
    askName: 'তোমার নাম লেখো',
    editName: 'নাম বদলাও',
    save: 'লিখে রাখো',
    open: 'খাতা খোলো',
    hint: 'খুলতে মলাটে ছোঁও, নাম বদলাতে লেবেলে।',
  },
  index: {
    title: 'সূচিপত্র',
    cricket: '১. খাতায় ক্রিকেট',
    football: '২. খাতায় ফুটবল',
    dotbox: '৩. ডট বক্স',
    soon: '৪. শীঘ্রই আসছে…',
    best: 'সেরা',
  },
  game: { cricket: 'খাতায় ক্রিকেট', football: 'খাতায় ফুটবল', dotbox: 'ডট বক্স' },
  shout: { six: 'ছক্কা!', out: 'আউট!', goal: 'গোল!', end: 'টিফিন শেষ!' },
  // Temporary game pages until Tasks 11-13 mount the games.
  soonGame: 'খেলাটা এই পাতায় আসছে',
  share: { saved: 'ছবিটা ডাউনলোড হয়েছে', failed: 'ছবি বানানো গেল না, আবার চেষ্টা করো' },
  buttons: { toBench: 'বেঞ্চে ফেরো', share: 'শেয়ার', again: 'আবার খেলো', toIndex: 'সূচিপত্রে ফেরো', close: 'বন্ধ করো' },
  settings: {
    title: 'সেটিংস',
    soundOn: 'শব্দ চালু',
    soundOff: 'শব্দ বন্ধ',
    reset: 'বেঞ্চ নতুন করে সাজাও',
    credits: 'কৃতজ্ঞতা',
    fonts: 'ফন্ট: আত্মা, গালাডা, প্যাট্রিক হ্যান্ড (SIL OFL)',
    sound: 'শব্দ',
    confirmReset: 'সব জিনিস আগের জায়গায় ফিরবে, আঁকাও মুছে যাবে। ঠিক আছে?',
  },
} as const
