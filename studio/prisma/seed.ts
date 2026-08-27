import { PrismaClient } from "@prisma/client";
import { INDUSTRY_PRESETS } from "../src/lib/data/industries";

const prisma = new PrismaClient();

async function main() {
  for (const preset of INDUSTRY_PRESETS) {
    const industry = await prisma.industry.upsert({
      where: { key: preset.key },
      update: {
        name: preset.name,
        description: preset.description,
        defaultTone: preset.defaultTone,
        defaultAudience: preset.defaultAudience,
        contentAngles: preset.contentAngles,
        hooks: preset.hooks,
        ctaStyles: preset.ctaStyles,
        objectives: preset.objectives,
      },
      create: {
        key: preset.key,
        name: preset.name,
        description: preset.description,
        defaultTone: preset.defaultTone,
        defaultAudience: preset.defaultAudience,
        contentAngles: preset.contentAngles,
        hooks: preset.hooks,
        ctaStyles: preset.ctaStyles,
        objectives: preset.objectives,
        isCustom: false,
      },
    });

    const templateName = `${preset.name} — Standard Post`;
    const existing = await prisma.template.findFirst({
      where: { industryId: industry.id, isSystem: true, name: templateName },
    });
    if (!existing) {
      await prisma.template.create({
        data: {
          name: templateName,
          description: `Default ${preset.name.toLowerCase()} social post preset: ${preset.defaultTone.toLowerCase()} tone, aimed at ${preset.defaultAudience.toLowerCase()}.`,
          platform: "INSTAGRAM",
          contentType: "SOCIAL_POST",
          tone: preset.defaultTone,
          promptHints: `Lean on this angle: ${preset.contentAngles[0]}. Consider a hook like: "${preset.hooks[0]}".`,
          isSystem: true,
          industryId: industry.id,
        },
      });
    }
  }

  console.log(`Seeded ${INDUSTRY_PRESETS.length} industries and their default templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
