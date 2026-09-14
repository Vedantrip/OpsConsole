import { analyzeHandles, buildWorkbook } from "@/lib/instagram-audit";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body?.handles) || body.handles.length === 0) {
      return new Response(JSON.stringify({ error: "Provide a non-empty 'handles' array." }), { status: 400 });
    }
    const audit = await analyzeHandles(body.handles, body.reelsLimit);
    if (audit.results.length === 0) {
      return new Response(JSON.stringify({ error: "All handles failed.", errors: audit.errors }), { status: 502 });
    }
    const workbook = await buildWorkbook(audit.results);
    return new Response(workbook, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mountlift-insights-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Export failed.", { status: 500 });
  }
}
