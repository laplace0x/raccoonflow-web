import type { MetadataRoute } from "next";
import { demoAgents } from "@/lib/agents";

const baseUrl = "https://raccoonflow.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8
    }
  ];

  const agentRoutes = demoAgents.map((agent) => ({
    url: `${baseUrl}/agents/${agent.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  return [...staticRoutes, ...agentRoutes];
}
