export const PLATFORMS = [
  { value: "XIAOHONGSHU", label: "Xiaohongshu" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "CUSTOM", label: "Custom" },
];

export const CONTENT_TYPES = [
  { value: "PROMOTIONAL_COPY", label: "Promotional post" },
  { value: "EDUCATIONAL_POST", label: "Educational post" },
  { value: "PRODUCT_DESCRIPTION", label: "Product introduction" },
  { value: "STORYTELLING", label: "Storytelling" },
  { value: "RECRUITMENT", label: "Recruitment" },
  { value: "REVIEW", label: "Review" },
  { value: "CAMPAIGN_POST", label: "Campaign" },
  { value: "VIDEO_SCRIPT", label: "Short video script" },
  { value: "SOCIAL_POST", label: "Social post" },
  { value: "ADVERTISEMENT", label: "Advertisement" },
  { value: "HEADLINE", label: "Headline" },
  { value: "CTA", label: "CTA" },
];

export const TONES = [
  "Professional",
  "Friendly",
  "Casual",
  "Luxury",
  "Funny",
  "Educational",
  "Emotional",
  "Viral/Social-media style",
];

export const LANGUAGES = ["English", "Simplified Chinese", "Traditional Chinese", "Malay", "Mixed Chinese + English", "Custom"];

export const LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export const VARIATIONS = [1, 3, 5];

export const QUICK_GENERATE_PRESETS = [
  { label: "Xiaohongshu Post", platform: "XIAOHONGSHU", contentType: "SOCIAL_POST" },
  { label: "Instagram Caption", platform: "INSTAGRAM", contentType: "SOCIAL_POST" },
  { label: "Facebook Ad", platform: "FACEBOOK", contentType: "ADVERTISEMENT" },
  { label: "TikTok Script", platform: "TIKTOK", contentType: "VIDEO_SCRIPT" },
  { label: "Product Copy", platform: "CUSTOM", contentType: "PRODUCT_DESCRIPTION" },
  { label: "Promotional Copy", platform: "CUSTOM", contentType: "PROMOTIONAL_COPY" },
  { label: "Custom Content", platform: "CUSTOM", contentType: "SOCIAL_POST" },
];

export const IMAGE_PRESETS = [
  { label: "Xiaohongshu 3:4", value: "3:4" },
  { label: "Instagram 1:1", value: "1:1" },
  { label: "Instagram 4:5", value: "4:5" },
  { label: "Story 9:16", value: "9:16-story" },
  { label: "TikTok 9:16", value: "9:16-tiktok" },
  { label: "Facebook 1:1", value: "1:1-fb" },
  { label: "Landscape 16:9", value: "16:9" },
];

export const IMAGE_STYLES = [
  "Product photography",
  "Lifestyle",
  "Luxury",
  "Minimal",
  "Editorial",
  "Food photography",
  "Neon",
  "Gaming",
  "3D",
  "Illustration",
];

export const VIDEO_DURATIONS = [
  { value: "15s", label: "15 seconds" },
  { value: "30s", label: "30 seconds" },
  { value: "60s", label: "60 seconds" },
];
