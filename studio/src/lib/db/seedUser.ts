import { prisma } from "./prisma";
import type { Platform, ContentType, ContentStatus } from "@prisma/client";
import { toJsonInput } from "./json";

interface DemoBrand {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  voice: string;
  preferredLanguages: string[];
  preferredPlatforms: string[];
  sellingPoints: string[];
  forbiddenWords: string[];
  preferredCta: string;
  website: string;
}

interface DemoContent {
  brandIndex: number;
  title: string;
  platform: Platform;
  industry: string;
  contentType: ContentType;
  targetAudience: string;
  status: ContentStatus;
  isFavorite?: boolean;
  tags: string[];
  body: string;
  cta: string;
  hashtags: string[];
  sections?: Record<string, unknown>;
}

const DEMO_BRANDS: DemoBrand[] = [
  {
    name: "Riverbend Kitchen",
    description: "A neighborhood restaurant serving modern comfort food with a seasonal, locally-sourced menu.",
    industry: "restaurant",
    targetAudience: "Local foodies and families looking for a reliable weeknight dinner spot",
    voice: "Warm, a little playful, never stiff — like the friend who always knows where to eat",
    preferredLanguages: ["English"],
    preferredPlatforms: ["INSTAGRAM", "FACEBOOK"],
    sellingPoints: ["Locally-sourced seasonal menu", "Family-owned since 2016", "Full bar with weekly cocktail specials"],
    forbiddenWords: ["cheap", "basic"],
    preferredCta: "Book a table",
    website: "https://riverbendkitchen.example.com",
  },
  {
    name: "Lumière Beauty Studio",
    description: "A boutique beauty salon offering facials, lash extensions, and skincare consultations.",
    industry: "beauty",
    targetAudience: "Beauty-conscious clients in their 20s-40s who want visible results and a relaxing experience",
    voice: "Elevated but approachable, confident, results-focused",
    preferredLanguages: ["English", "Simplified Chinese"],
    preferredPlatforms: ["XIAOHONGSHU", "INSTAGRAM"],
    sellingPoints: ["Custom skincare consultations", "Medical-grade facial equipment", "5-star rated lash artists"],
    forbiddenWords: ["miracle", "guaranteed"],
    preferredCta: "Book your appointment",
    website: "https://lumierebeauty.example.com",
  },
  {
    name: "Harborview Realty Group",
    description: "A boutique real estate agency specializing in waterfront and downtown condo listings.",
    industry: "real-estate",
    targetAudience: "First-time buyers and downsizing homeowners in the metro area",
    voice: "Professional, precise, confidence without hype",
    preferredLanguages: ["English"],
    preferredPlatforms: ["FACEBOOK", "LINKEDIN"],
    sellingPoints: ["15+ years in the local market", "Average 9 days on market", "Free home valuation"],
    forbiddenWords: ["dream home", "won't last"],
    preferredCta: "Schedule a viewing",
    website: "https://harborviewrealty.example.com",
  },
  {
    name: "Northstar Growth Collective",
    description: "A performance marketing agency helping DTC brands scale paid social and email.",
    industry: "marketing-agency",
    targetAudience: "Founders and marketing leads at $1M-$20M DTC brands",
    voice: "Direct, data-backed, no fluff",
    preferredLanguages: ["English"],
    preferredPlatforms: ["LINKEDIN", "INSTAGRAM"],
    sellingPoints: ["Managed $40M+ in ad spend", "Average 3.2x ROAS across clients", "No long-term contracts"],
    forbiddenWords: ["guru", "hack"],
    preferredCta: "Book a free strategy call",
    website: "https://northstargrowth.example.com",
  },
  {
    name: "Wanderpack",
    description: "A DTC e-commerce brand selling modular, weatherproof travel backpacks.",
    industry: "ecommerce",
    targetAudience: "Frequent travelers aged 22-40 who value durability and minimalist design",
    voice: "Confident, minimal, a little adventurous",
    preferredLanguages: ["English"],
    preferredPlatforms: ["TIKTOK", "INSTAGRAM"],
    sellingPoints: ["Lifetime warranty", "Fully waterproof shell", "Modular compartments — 3 bags in 1"],
    forbiddenWords: ["cheap", "knockoff"],
    preferredCta: "Shop now",
    website: "https://wanderpack.example.com",
  },
];

const DEMO_CONTENT: DemoContent[] = [
  {
    brandIndex: 0,
    title: "Fall menu launch — Instagram post",
    platform: "INSTAGRAM",
    industry: "restaurant",
    contentType: "SOCIAL_POST",
    targetAudience: "Local foodies and families",
    status: "PUBLISHED",
    isFavorite: true,
    tags: ["seasonal", "menu-launch"],
    body: "Our fall menu just dropped, and the braised short rib is already the table favorite. 🍂\n\nSlow-cooked for six hours, finished with a cider glaze, and served over roasted root vegetables from the farm two towns over. This is the kind of dish that makes a Tuesday feel like an occasion.\n\nWe're taking reservations for the next two weeks — the 7pm slots are going first.",
    cta: "Book a table",
    hashtags: ["RiverbendKitchen", "FallMenu", "LocalEats", "ComfortFood", "SeasonalCooking"],
  },
  {
    brandIndex: 0,
    title: "Weekend brunch reminder — Facebook",
    platform: "FACEBOOK",
    industry: "restaurant",
    contentType: "PROMOTIONAL_COPY",
    targetAudience: "Weekend brunch regulars",
    status: "GENERATED",
    tags: ["brunch", "weekly"],
    body: "Saturday and Sunday, 9am-2pm — brunch is back with a new addition: brown butter pancakes with candied pecans. We've also brought back bottomless mimosas for the table (yes, the whole table).\n\nNo reservation needed for parties under 4, but if you're coming with a crew, give us a call and we'll set you up.",
    cta: "Walk-ins welcome",
    hashtags: ["RiverbendKitchen", "WeekendBrunch", "Mimosas", "LocalEats"],
  },
  {
    brandIndex: 1,
    title: "HydraGlow facial launch — Xiaohongshu",
    platform: "XIAOHONGSHU",
    industry: "beauty",
    contentType: "SOCIAL_POST",
    targetAudience: "Beauty-conscious clients 25-40",
    status: "GENERATED",
    isFavorite: true,
    tags: ["facial", "new-treatment"],
    body:
      "做了三次之后皮肤真的不一样了 ✨\n\n之前一直被暗沉和毛孔困扰，试了很多产品效果都很一般。上个月开始在 Lumière 做 HydraGlow 深层清洁+补水，第一次做完就感觉皮肤明显亮了一个度。\n\n最喜欢的是他们会先做皮肤检测，根据你的肤质调整仪器强度，不是那种一刀切的流程。做完当天皮肤状态就很稳定，没有泛红刺激的情况。\n\n现在基本每三周去一次，已经变成我的例行保养项目了。",
    cta: "评论区告诉我你的肤质问题，帮你看看适不适合～",
    hashtags: ["护肤", "深层清洁", "补水", "美容院推荐", "HydraGlow", "Lumière"],
    sections: {
      titles: [
        "做完这个facial之后我的毛孔真的变小了",
        "5个理由让我回购这家美容院",
        "被我挖到的宝藏美容工作室",
        "暗沉救星，亲测有效",
        "本地这家美容院有点东西",
      ],
      hook: "做了三次之后皮肤真的不一样了 ✨",
      introduction: "Lumière Beauty Studio 主要做面部护理、睫毛种植和皮肤咨询，在市中心。",
      benefits: ["✔️ 定制皮肤检测，不是一刀切流程", "✔️ 医美级仪器", "✔️ 五星睫毛师"],
      cta: "评论区告诉我你的肤质问题，帮你看看适不适合～",
      hashtags: ["护肤", "深层清洁", "补水", "美容院推荐", "HydraGlow", "Lumière"],
    },
  },
  {
    brandIndex: 2,
    title: "New waterfront listing — Facebook",
    platform: "FACEBOOK",
    industry: "real-estate",
    contentType: "ADVERTISEMENT",
    targetAudience: "First-time buyers and downsizing homeowners",
    status: "GENERATED",
    tags: ["new-listing", "waterfront"],
    body: "Just listed: a 2-bed, 2-bath condo on the 14th floor with unobstructed harbor views. Recently renovated kitchen, in-unit laundry, and a building with a 24-hour concierge.\n\nListed at $649,000. Comparable units in this building have sold within 12 days over the last two quarters, so if this one's on your radar, don't wait to reach out.",
    cta: "Schedule a viewing",
    hashtags: ["HarborviewRealty", "NewListing", "WaterfrontLiving", "CondoLife"],
  },
  {
    brandIndex: 3,
    title: "Client case study — LinkedIn",
    platform: "LINKEDIN",
    industry: "marketing-agency",
    contentType: "SOCIAL_POST",
    targetAudience: "Founders and marketing leads at DTC brands",
    status: "PUBLISHED",
    tags: ["case-study", "results"],
    body: "A skincare client came to us spending $18k/month on Meta ads with a 1.4x ROAS. Three months later: 3.6x ROAS on $31k/month spend.\n\nWhat changed:\n— Rebuilt the creative testing pipeline (5 new concepts/week instead of 1)\n— Moved 40% of budget into UGC-style ads\n— Fixed a broken post-purchase email flow that was leaving revenue on the table\n\nNone of this was a hack. It was just running the fundamentals properly, consistently, for 90 days straight.",
    cta: "Book a free strategy call",
    hashtags: ["PerformanceMarketing", "DTC", "CaseStudy", "MetaAds"],
  },
  {
    brandIndex: 4,
    title: "Modular backpack demo — TikTok script",
    platform: "TIKTOK",
    industry: "ecommerce",
    contentType: "VIDEO_SCRIPT",
    targetAudience: "Frequent travelers 22-40",
    status: "GENERATED",
    tags: ["product-demo", "tiktok"],
    body: "Hook: \"I packed for a 10-day trip in ONE bag and here's how.\"\n\nScene 1 — Visual: unzipping the main compartment, camera close on the modular dividers. Voiceover: \"This is the Wanderpack — it's actually three bags in one.\" On-screen text: \"3-in-1 modular design\"\n\nScene 2 — Visual: detaching the daypack module and walking with just that piece. Voiceover: \"Day trip? Pop off the front pack and go.\" On-screen text: \"Detachable daypack\"\n\nScene 3 — Visual: pouring water over the shell, beading off. Voiceover: \"And yes, it's fully waterproof — I've tested this in an actual rainstorm.\" On-screen text: \"100% waterproof shell\"\n\nCTA: \"Link in bio, lifetime warranty included.\"",
    cta: "Shop now",
    hashtags: ["Wanderpack", "TravelGear", "PackingHacks", "TravelTikTok"],
  },
  {
    brandIndex: 4,
    title: "Product description — Wanderpack 40L",
    platform: "CUSTOM",
    industry: "ecommerce",
    contentType: "PRODUCT_DESCRIPTION",
    targetAudience: "Frequent travelers",
    status: "DRAFT",
    tags: ["product-page"],
    body: "The Wanderpack 40L is built for people who travel often and pack light on purpose. A fully waterproof shell protects everything inside, while the modular front compartment detaches into a standalone daypack for day trips — no need to carry a second bag.\n\nInside: a padded 16\" laptop sleeve, a separate shoe compartment, and compression straps that keep the pack the same size whether it's half-full or completely packed. Every Wanderpack ships with a lifetime warranty against wear and stitching failure.",
    cta: "Shop now",
    hashtags: ["Wanderpack", "TravelGear"],
  },
];

export async function seedDefaultsForUser(userId: string) {
  await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId, defaultLanguage: "English" },
  });

  const createdBrands = await Promise.all(
    DEMO_BRANDS.map((b, i) =>
      prisma.brand.create({
        data: {
          userId,
          name: b.name,
          description: b.description,
          industry: b.industry,
          targetAudience: b.targetAudience,
          voice: b.voice,
          preferredLanguages: b.preferredLanguages,
          preferredPlatforms: b.preferredPlatforms,
          sellingPoints: b.sellingPoints,
          forbiddenWords: b.forbiddenWords,
          preferredCta: b.preferredCta,
          website: b.website,
          isDefault: i === 0,
        },
      })
    )
  );

  for (const c of DEMO_CONTENT) {
    const content = await prisma.content.create({
      data: {
        userId,
        brandId: createdBrands[c.brandIndex].id,
        title: c.title,
        platform: c.platform,
        industry: c.industry,
        contentType: c.contentType,
        targetAudience: c.targetAudience,
        status: c.status,
        isFavorite: c.isFavorite ?? false,
        tags: c.tags,
        body: c.body,
        cta: c.cta,
        hashtags: c.hashtags,
        sections: c.sections ? toJsonInput(c.sections) : undefined,
        currentVersionNumber: 1,
      },
    });

    await prisma.contentVersion.create({
      data: {
        contentId: content.id,
        versionNumber: 1,
        title: c.title,
        body: c.body,
        cta: c.cta,
        hashtags: c.hashtags,
        sections: c.sections ? toJsonInput(c.sections) : undefined,
        changeNote: "Initial generation (demo seed)",
      },
    });

    await prisma.generationHistory.create({
      data: {
        userId,
        contentId: content.id,
        type: "TEXT",
        provider: "template",
        model: "template-v1",
        status: "FALLBACK",
        durationMs: 400 + Math.floor(Math.random() * 800),
      },
    });
  }

  return { brands: createdBrands.length, content: DEMO_CONTENT.length };
}
