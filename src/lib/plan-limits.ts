import { prisma } from "./prisma";
import { PLANS, type PlanTier } from "./plans";

export async function checkProjectLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const [subscription, projectCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.project.count({ where: { userId } }),
  ]);

  const tier = (subscription?.tier ?? "FREE") as PlanTier;
  const plan = PLANS[tier];
  const max = plan.limits.maxProjects;

  return {
    allowed: projectCount < max,
    current: projectCount,
    max: max === Infinity ? -1 : max,
  };
}

export async function checkExportLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = (subscription?.tier ?? "FREE") as PlanTier;
  const plan = PLANS[tier];
  const max = plan.limits.maxExportsPerMonth;

  // Count exports this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const exportCount = await prisma.exportJob.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  return {
    allowed: exportCount < max,
    current: exportCount,
    max: max === Infinity ? -1 : max,
  };
}

export async function canExportMQL5(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = (subscription?.tier ?? "FREE") as PlanTier;
  const plan = PLANS[tier];

  return plan.limits.canExportMQL5;
}

export async function canExportEX5(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = (subscription?.tier ?? "FREE") as PlanTier;
  const plan = PLANS[tier];

  return plan.limits.canExportEX5;
}

export async function getUserPlanLimits(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = (subscription?.tier ?? "FREE") as PlanTier;
  const plan = PLANS[tier];

  return {
    tier,
    plan: plan.name,
    limits: plan.limits,
    subscription,
  };
}
