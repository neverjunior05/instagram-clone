// Every media/data source URL lives here so it can be swapped easily.
// All images are Picsum placeholders (Unsplash-sourced, free license); avatars are DiceBear.
export const media = {
  avatar: (seed: string) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a21,26262f`,
  photo: (seed: string, w = 1080, h = 1350) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`,
  landingTiles: Array.from({ length: 18 }, (_, i) => `https://picsum.photos/seed/lumio-wall-${i}/400/520`),
  // Short sample clips (Google sample bucket, freely distributed test media)
  reels: [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  ],
  audio: ["Lumio Library — Night Drive (CC0 demo)", "Lumio Library — Paper Boats (CC0 demo)", "Lumio Library — Golden Hour Loop (CC0 demo)", "Original audio"],
};

export const allowedMediaHosts = ["picsum.photos", "fastly.picsum.photos", "images.unsplash.com", "images.pexels.com", "videos.pexels.com", "storage.googleapis.com", "res.cloudinary.com", "assets.mixkit.co", "api.dicebear.com"];

export const credits = [
  { name: "Picsum Photos / Unsplash", license: "Unsplash License", url: "https://picsum.photos" },
  { name: "DiceBear Notionists", license: "CC0 1.0", url: "https://dicebear.com" },
  { name: "Google sample videos bucket", license: "Test media (Blender Foundation / Google samples)", url: "https://storage.googleapis.com/gtv-videos-bucket/sample/" },
  { name: "Manrope, Inter, DM Mono", license: "SIL Open Font License", url: "https://fonts.google.com" },
];

export const categories = ["All", "Photography", "Travel", "Food", "Art", "Fitness", "Pets", "Tech"];
