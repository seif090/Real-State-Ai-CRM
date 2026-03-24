import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.dealStageHistory.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.property.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.leadTagOnLead.deleteMany();
  await prisma.leadTag.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const superAdmin = await prisma.user.create({
    data: {
      fullName: "Platform Super Admin",
      email: "superadmin@realestateai.crm",
      passwordHash,
      role: UserRole.SUPER_ADMIN
    }
  });

  const nileKeys = await prisma.company.create({
    data: {
      name: "Nile Keys Realty",
      slug: "nile-keys",
      country: "Egypt",
      timezone: "Africa/Cairo",
      status: "ACTIVE"
    }
  });

  const gulfNest = await prisma.company.create({
    data: {
      name: "Gulf Nest Properties",
      slug: "gulf-nest",
      country: "UAE",
      timezone: "Asia/Dubai",
      status: "ACTIVE"
    }
  });

  const nileAdmin = await prisma.user.create({
    data: {
      companyId: nileKeys.id,
      fullName: "Mariam Hossam",
      email: "mariam@nilekeys.com",
      phone: "+201001112233",
      passwordHash,
      role: UserRole.COMPANY_ADMIN
    }
  });

  const nileAgent1 = await prisma.user.create({
    data: {
      companyId: nileKeys.id,
      fullName: "Ahmed Samir",
      email: "ahmed.samir@nilekeys.com",
      phone: "+201022233344",
      passwordHash,
      role: UserRole.SALES_AGENT
    }
  });

  const nileAgent2 = await prisma.user.create({
    data: {
      companyId: nileKeys.id,
      fullName: "Salma Adel",
      email: "salma.adel@nilekeys.com",
      phone: "+201033344455",
      passwordHash,
      role: UserRole.SALES_AGENT
    }
  });

  const gulfAdmin = await prisma.user.create({
    data: {
      companyId: gulfNest.id,
      fullName: "Omar Al Harbi",
      email: "omar@gulfnest.ae",
      phone: "+971501112233",
      passwordHash,
      role: UserRole.COMPANY_ADMIN
    }
  });

  const gulfAgent = await prisma.user.create({
    data: {
      companyId: gulfNest.id,
      fullName: "Lina Rashid",
      email: "lina@gulfnest.ae",
      phone: "+971502223344",
      passwordHash,
      role: UserRole.SALES_AGENT
    }
  });

  const property1 = await prisma.property.create({
    data: {
      companyId: nileKeys.id,
      code: "NK-ZED-001",
      title: "شقة فاخرة في ZED West",
      locationText: "الشيخ زايد - ZED West",
      propertyType: "APARTMENT",
      listingType: "SALE",
      price: 12800000,
      currency: "EGP",
      areaSqm: 168,
      bedrooms: 3,
      bathrooms: 3,
      description: "تشطيب كامل، إطلالة مفتوحة، جاهزة للاستلام خلال 6 أشهر.",
      status: "AVAILABLE",
      ownerName: "ZED Resale Desk",
      ownerPhone: "+201277700001",
      createdByUserId: nileAdmin.id,
      media: {
        create: [
          { fileUrl: "https://images.example.com/nk-zed-001-1.jpg", sortOrder: 1 },
          { fileUrl: "https://images.example.com/nk-zed-001-2.jpg", sortOrder: 2 }
        ]
      }
    }
  });

  const property2 = await prisma.property.create({
    data: {
      companyId: nileKeys.id,
      code: "NK-MIVIDA-004",
      title: "فيلا مستقلة في ميفيدا",
      locationText: "التجمع الخامس - ميفيدا",
      propertyType: "VILLA",
      listingType: "SALE",
      price: 36500000,
      currency: "EGP",
      areaSqm: 420,
      bedrooms: 5,
      bathrooms: 5,
      description: "تشطيب سوبر لوكس، حديقة خاصة، موقع متميز بالقرب من النادي.",
      status: "AVAILABLE",
      ownerName: "Private Seller",
      ownerPhone: "+201277700002",
      createdByUserId: nileAdmin.id
    }
  });

  const property3 = await prisma.property.create({
    data: {
      companyId: nileKeys.id,
      code: "NK-SWAN-011",
      title: "تاون هاوس في Swan Lake North Coast",
      locationText: "الساحل الشمالي - Swan Lake",
      propertyType: "TOWNHOUSE",
      listingType: "SALE",
      price: 21400000,
      currency: "EGP",
      areaSqm: 235,
      bedrooms: 4,
      bathrooms: 4,
      description: "مفروش بالكامل، قريب من البحيرات، مناسب للاستثمار الصيفي.",
      status: "AVAILABLE",
      ownerName: "Developer Inventory",
      ownerPhone: "+201277700003",
      createdByUserId: nileAdmin.id
    }
  });

  const property4 = await prisma.property.create({
    data: {
      companyId: gulfNest.id,
      code: "GN-DXB-221",
      title: "Apartment in Dubai Creek Harbour",
      locationText: "Dubai Creek Harbour",
      propertyType: "APARTMENT",
      listingType: "SALE",
      price: 2850000,
      currency: "AED",
      areaSqm: 112,
      bedrooms: 2,
      bathrooms: 2,
      description: "High-floor unit with skyline view and post-handover payment plan.",
      status: "AVAILABLE",
      ownerName: "Developer Channel",
      ownerPhone: "+971527770001",
      createdByUserId: gulfAdmin.id
    }
  });

  const lead1 = await prisma.lead.create({
    data: {
      companyId: nileKeys.id,
      assignedToUserId: nileAgent1.id,
      source: "WHATSAPP",
      fullName: "Karim Fathy",
      phone: "+201155667788",
      email: "karim.fathy@example.com",
      budgetMin: 10000000,
      budgetMax: 14000000,
      preferredLocation: "الشيخ زايد",
      propertyType: "APARTMENT",
      intent: "BUY",
      status: "INTERESTED",
      temperature: "HOT",
      lastContactAt: new Date("2026-03-22T13:15:00Z"),
      notes: {
        create: [
          {
            authorUserId: nileAgent1.id,
            content: "العميل جاد ويبحث عن استلام قريب وخطة سداد قصيرة."
          }
        ]
      }
    }
  });

  const lead2 = await prisma.lead.create({
    data: {
      companyId: nileKeys.id,
      assignedToUserId: nileAgent2.id,
      source: "WHATSAPP",
      fullName: "Nourhan Tarek",
      phone: "+201166778899",
      email: "nourhan.t@example.com",
      budgetMin: 18000000,
      budgetMax: 23000000,
      preferredLocation: "الساحل الشمالي",
      propertyType: "TOWNHOUSE",
      intent: "INVEST",
      status: "VIEWING_SCHEDULED",
      temperature: "HOT",
      lastContactAt: new Date("2026-03-23T10:00:00Z")
    }
  });

  const lead3 = await prisma.lead.create({
    data: {
      companyId: nileKeys.id,
      assignedToUserId: nileAgent1.id,
      source: "MANUAL",
      fullName: "Youssef Sherif",
      phone: "+201177889900",
      email: "youssef.sherif@example.com",
      budgetMin: 30000000,
      budgetMax: 40000000,
      preferredLocation: "التجمع الخامس",
      propertyType: "VILLA",
      intent: "BUY",
      status: "NEGOTIATION",
      temperature: "HOT",
      lastContactAt: new Date("2026-03-24T09:30:00Z")
    }
  });

  const lead4 = await prisma.lead.create({
    data: {
      companyId: gulfNest.id,
      assignedToUserId: gulfAgent.id,
      source: "WHATSAPP",
      fullName: "Hamad Al Nuaimi",
      phone: "+971558889900",
      email: "hamad@example.ae",
      budgetMin: 2500000,
      budgetMax: 3200000,
      preferredLocation: "Dubai Creek Harbour",
      propertyType: "APARTMENT",
      intent: "BUY",
      status: "CONTACTED",
      temperature: "WARM",
      lastContactAt: new Date("2026-03-23T15:45:00Z")
    }
  });

  const deal1 = await prisma.deal.create({
    data: {
      companyId: nileKeys.id,
      leadId: lead1.id,
      propertyId: property1.id,
      ownerUserId: nileAgent1.id,
      stage: "QUALIFIED",
      value: 12800000,
      expectedCloseDate: new Date("2026-04-10T00:00:00Z")
    }
  });

  const deal2 = await prisma.deal.create({
    data: {
      companyId: nileKeys.id,
      leadId: lead2.id,
      propertyId: property3.id,
      ownerUserId: nileAgent2.id,
      stage: "VIEWING",
      value: 21400000,
      expectedCloseDate: new Date("2026-04-20T00:00:00Z")
    }
  });

  const deal3 = await prisma.deal.create({
    data: {
      companyId: nileKeys.id,
      leadId: lead3.id,
      propertyId: property2.id,
      ownerUserId: nileAgent1.id,
      stage: "NEGOTIATION",
      value: 35250000,
      expectedCloseDate: new Date("2026-04-05T00:00:00Z")
    }
  });

  const deal4 = await prisma.deal.create({
    data: {
      companyId: gulfNest.id,
      leadId: lead4.id,
      propertyId: property4.id,
      ownerUserId: gulfAgent.id,
      stage: "LEAD",
      value: 2850000,
      expectedCloseDate: new Date("2026-04-30T00:00:00Z")
    }
  });

  await prisma.dealStageHistory.createMany({
    data: [
      {
        companyId: nileKeys.id,
        dealId: deal1.id,
        toStage: "QUALIFIED",
        changedById: nileAgent1.id
      },
      {
        companyId: nileKeys.id,
        dealId: deal2.id,
        toStage: "VIEWING",
        changedById: nileAgent2.id
      },
      {
        companyId: nileKeys.id,
        dealId: deal3.id,
        toStage: "NEGOTIATION",
        changedById: nileAgent1.id
      },
      {
        companyId: gulfNest.id,
        dealId: deal4.id,
        toStage: "LEAD",
        changedById: gulfAgent.id
      }
    ]
  });

  const conversation1 = await prisma.conversation.create({
    data: {
      companyId: nileKeys.id,
      leadId: lead1.id,
      channel: "WHATSAPP",
      externalThreadId: lead1.phone,
      status: "OPEN",
      lastMessageAt: new Date("2026-03-22T13:15:00Z")
    }
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      companyId: nileKeys.id,
      leadId: lead2.id,
      channel: "WHATSAPP",
      externalThreadId: lead2.phone,
      status: "OPEN",
      lastMessageAt: new Date("2026-03-23T10:00:00Z")
    }
  });

  const conversation3 = await prisma.conversation.create({
    data: {
      companyId: gulfNest.id,
      leadId: lead4.id,
      channel: "WHATSAPP",
      externalThreadId: lead4.phone,
      status: "OPEN",
      lastMessageAt: new Date("2026-03-23T15:45:00Z")
    }
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation1.id,
        senderType: "CUSTOMER",
        direction: "INBOUND",
        content: "محتاج شقة 3 غرف في الشيخ زايد بحد أقصى 14 مليون.",
        externalMessageId: "wamid-kf-1",
        deliveryStatus: "READ",
        createdAt: new Date("2026-03-22T13:00:00Z")
      },
      {
        conversationId: conversation1.id,
        senderType: "AI",
        direction: "OUTBOUND",
        content: "لدينا وحدات مناسبة في ZED West ويمكنني ترتيب مكالمة مع المستشار المسؤول.",
        externalMessageId: "wamid-kf-2",
        deliveryStatus: "DELIVERED",
        createdAt: new Date("2026-03-22T13:01:00Z")
      },
      {
        conversationId: conversation1.id,
        senderType: "AGENT",
        senderUserId: nileAgent1.id,
        direction: "OUTBOUND",
        content: "أرسلت لك التفاصيل وسأشارك معك موعد معاينة غدًا.",
        externalMessageId: "wamid-kf-3",
        deliveryStatus: "DELIVERED",
        createdAt: new Date("2026-03-22T13:15:00Z")
      },
      {
        conversationId: conversation2.id,
        senderType: "CUSTOMER",
        direction: "INBOUND",
        content: "أبحث عن تاون هاوس في الساحل الشمالي يصلح للاستثمار والعائد الإيجاري.",
        externalMessageId: "wamid-nt-1",
        deliveryStatus: "READ",
        createdAt: new Date("2026-03-23T09:40:00Z")
      },
      {
        conversationId: conversation2.id,
        senderType: "AGENT",
        senderUserId: nileAgent2.id,
        direction: "OUTBOUND",
        content: "رشحت لك وحدة في Swan Lake وحددنا معاينة يوم الجمعة الساعة 4 مساءً.",
        externalMessageId: "wamid-nt-2",
        deliveryStatus: "DELIVERED",
        createdAt: new Date("2026-03-23T10:00:00Z")
      },
      {
        conversationId: conversation3.id,
        senderType: "CUSTOMER",
        direction: "INBOUND",
        content: "I need a 2-bedroom apartment in Dubai Creek Harbour for end-use.",
        externalMessageId: "wamid-ha-1",
        deliveryStatus: "READ",
        createdAt: new Date("2026-03-23T15:30:00Z")
      },
      {
        conversationId: conversation3.id,
        senderType: "AI",
        direction: "OUTBOUND",
        content: "We have a suitable inventory with skyline view and flexible payment plan.",
        externalMessageId: "wamid-ha-2",
        deliveryStatus: "DELIVERED",
        createdAt: new Date("2026-03-23T15:45:00Z")
      }
    ]
  });

  console.log("Seed completed successfully.");
  console.log("Super admin:", superAdmin.email, " / Admin@123");
  console.log("Nile Keys admin:", nileAdmin.email, " / Admin@123");
  console.log("Gulf Nest admin:", gulfAdmin.email, " / Admin@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
