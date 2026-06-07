import { getAgent } from "@/lib/agents";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const agent = getAgent(slug);

  return Response.json({
    schema: "raccoonflow.reputation.v0.1",
    agent: {
      name: agent.name,
      slug: agent.slug
    },
    status: "placeholder",
    note:
      "Trading reputation, validation records, and trust scoring are later-phase extensions."
  });
}
