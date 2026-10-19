import type { MediaType, Privacy, TagKind, Theme } from "./schemas";

/** Demo data used by the mock service and the backend seed, so both look the same. */
export interface SeedMedia { file: string; type: MediaType; mimeType: string; size: number; caption: string }
export interface SeedReply { name: string; message: string; read: boolean; minutesAgo: number }
export interface SeedTag {
  id: string;
  owner: string;
  code: string;
  kind: TagKind;
  title: string;
  recipient: string | null;
  message: string;
  theme: Theme;
  privacy: Privacy;
  pin: string | null;
  opensInDays: number | null;
  allowReplies: boolean;
  archived: boolean;
  moveId: string | null;
  boxNumber: number | null;
  room: string | null;
  contents: string[];
  fragile: boolean;
  scansDaysAgo: number[];
  media: SeedMedia[];
  replies: SeedReply[];
  daysAgo: number;
}
export interface SeedUser { id: string; name: string; email: string; password: string }
export interface SeedMove { id: string; owner: string; name: string; fromAddress: string | null; toAddress: string | null; date: string | null; lastBoxNumber: number; daysAgo: number }

export const DEMO_PASSWORD = "password123";
export const SEED_USERS: SeedUser[] = [
  { id: "u_aigerim", name: "Aigerim Sadykova", email: "aigerim@example.com", password: DEMO_PASSWORD },
  { id: "u_dana", name: "Dana Omarova", email: "dana@example.com", password: DEMO_PASSWORD },
];

export const SEED_MOVES: SeedMove[] = [
  { id: "m_astana", owner: "u_aigerim", name: "Almaty → Astana", fromAddress: "Abay Ave 52, Almaty", toAddress: "Kabanbay Batyr 11, Astana", date: "2026-11-12", lastBoxNumber: 12, daysAgo: 10 },
  { id: "m_dacha", owner: "u_aigerim", name: "Summer at the dacha", fromAddress: null, toAddress: "Talgar", date: null, lastBoxNumber: 0, daysAgo: 3 },
];

const photo = (file: string, caption: string, size = 32000): SeedMedia => ({ file, type: "photo", mimeType: "image/jpeg", size, caption });

const box = (n: number, room: string, title: string, contents: string[], fragile = false, scans: number[] = []): SeedTag => ({
  id: `t_box${n}`,
  owner: "u_aigerim",
  code: ["K7TB2Q4M", "R3WX8NPA", "H6DC9ZQE", "B4MN7TYV", "Q8NB4FJD", "W2PK6RHS", "M5ZT3XCG", "T9GA2WEN", "C3VR8KPU", "N7HE5DQX", "Y4JS6BMA", "F8QW2TZC"][n - 1],
  kind: "box",
  title,
  recipient: null,
  message: "",
  theme: "kraft",
  privacy: "public",
  pin: null,
  opensInDays: null,
  allowReplies: false,
  archived: false,
  moveId: "m_astana",
  boxNumber: n,
  room,
  contents,
  fragile,
  scansDaysAgo: scans,
  media: n === 7 ? [photo("kettle.jpg", "Top layer, wrapped in towels")] : [],
  replies: [],
  daysAgo: 9,
});

export const SEED_TAGS: SeedTag[] = [
  {
    id: "t_keys", owner: "u_aigerim", code: "7KQ4M2XP", kind: "gift", title: "Keys to your first home", recipient: "Aruzhan",
    message: "Aruzhan, жаным!\n\nThese are the keys to the flat on Kabanbay Batyr. You wanted a place with a balcony and a view of Baiterek, and here it is.\n\nThe voice message is from Ata. Open the photos last.\n\nWith love, Mum",
    theme: "rose", privacy: "public", pin: null, opensInDays: null, allowReplies: true, archived: false, moveId: null, boxNumber: null, room: null, contents: [], fragile: false,
    scansDaysAgo: [0, 0, 1, 2, 3, 5, 9, 12],
    media: [photo("keys.jpg", "The keys, finally"), photo("almaty-mountains.jpg", "The view from our old balcony"), { file: "voice-hello.ogg", type: "audio", mimeType: "audio/ogg", size: 7738, caption: "From Ata" }, { file: "greeting.webm", type: "video", mimeType: "video/webm", size: 115980, caption: "Everyone says hi" }],
    replies: [
      { name: "Aruzhan", message: "Мама, I cried at the bus stop. Рахмет! 💛", read: false, minutesAgo: 90 },
      { name: "Timur", message: "Congrats sis! When is the housewarming?", read: true, minutesAgo: 60 * 26 },
    ],
    daysAgo: 14,
  },
  {
    id: "t_birthday", owner: "u_aigerim", code: "P4XH9M3K", kind: "gift", title: "Happy 30th, Dana", recipient: "Dana",
    message: "Thirty! Open this on your birthday morning, not before. I recorded something with everyone from school.",
    theme: "sky", privacy: "public", pin: null, opensInDays: 117, allowReplies: true, archived: false, moveId: null, boxNumber: null, room: null, contents: [], fragile: false,
    scansDaysAgo: [1, 4], media: [photo("cake.jpg", "Your cake, in advance")], replies: [], daysAgo: 6,
  },
  {
    id: "t_dombra", owner: "u_aigerim", code: "D8RW5TQN", kind: "keepsake", title: "Grandpa Serik's dombra", recipient: null,
    message: "Serik ata made this dombra in 1971 in Taldykorgan. He played it at every toi in the family.\n\nThe crack on the side is from the move in 1998. Do not glue it.",
    theme: "sage", privacy: "pin", pin: "1971", opensInDays: null, allowReplies: false, archived: false, moveId: null, boxNumber: null, room: null, contents: [], fragile: false,
    scansDaysAgo: [2, 30], media: [photo("dombra.jpg", "In the old flat, 2004"), photo("album.jpg", "Ata with the dombra at our wedding")], replies: [], daysAgo: 30,
  },
  {
    id: "t_album", owner: "u_aigerim", code: "S6ZE3VKA", kind: "keepsake", title: "Family album 1985-1999", recipient: null,
    message: "Scans of the paper album. The originals are in the blue box on the top shelf.",
    theme: "paper", privacy: "private", pin: null, opensInDays: null, allowReplies: false, archived: false, moveId: null, boxNumber: null, room: null, contents: [], fragile: false,
    scansDaysAgo: [], media: [photo("album.jpg", "Medeu, 1987"), photo("steppe-sunset.jpg", "Road to Kapchagay")], replies: [], daysAgo: 40,
  },
  {
    id: "t_old", owner: "u_aigerim", code: "V3CT7NWB", kind: "gift", title: "Teacher's day flowers", recipient: "Gulnara apai",
    message: "Thank you for everything this year.", theme: "rose", privacy: "public", pin: null, opensInDays: null, allowReplies: true, archived: true, moveId: null, boxNumber: null, room: null, contents: [], fragile: false,
    scansDaysAgo: [200], media: [], replies: [], daysAgo: 380,
  },
  box(1, "Kitchen", "Plates and bowls", ["Dinner plates x12", "Soup bowls x6", "Kese cups x8", "Serving dish"], true, [0]),
  box(2, "Kitchen", "Pots and pans", ["Kazan", "Frying pan", "Small pot", "Lids"]),
  box(3, "Bedroom", "Winter clothes", ["Down jacket", "Blue blanket", "Wool socks", "Scarves"]),
  box(4, "Bedroom", "Bed linen", ["Duvet covers x3", "Pillowcases", "Towels"]),
  box(5, "Living room", "Books", ["Abai poems", "Cookbooks", "Photo albums", "Board games"], false, [1]),
  box(6, "Living room", "TV and cables", ["HDMI cables", "Router", "Remote controls", "Extension cord"], true),
  box(7, "Kitchen", "Kitchen everyday", ["Electric kettle", "Mugs x6", "Tea (lots)", "Sugar bowl", "Cutlery tray"], true, [0, 0, 1]),
  box(8, "Bathroom", "Bathroom", ["Hair dryer", "First aid kit", "Shampoo", "Toothbrushes"]),
  box(9, "Kitchen", "Cleaning", ["Kettle descaler", "Sponges", "Dish soap", "Rubber gloves"]),
  box(10, "Kids room", "Arman's toys", ["Lego", "Toy trucks", "Puzzle 500 pcs", "Night lamp"], false, [2]),
  box(11, "Office", "Office", ["Laptop stand", "Monitor cable", "Documents folder", "Passport copies"]),
  box(12, "Hallway", "Shoes", ["Winter boots", "Sneakers", "Slippers x5"]),
  {
    id: "t_dana_gift", owner: "u_dana", code: "G5MK8WRT", kind: "gift", title: "For Aigerim, with thanks", recipient: "Aigerim",
    message: "Thank you for helping with the move!", theme: "kraft", privacy: "pin", pin: "2468", opensInDays: null, allowReplies: true, archived: false, moveId: null, boxNumber: null, room: null, contents: [], fragile: false,
    scansDaysAgo: [], media: [photo("boxes.jpg", "All those boxes")], replies: [], daysAgo: 2,
  },
];
