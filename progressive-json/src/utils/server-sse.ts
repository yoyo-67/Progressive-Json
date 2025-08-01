import { Response } from "express";

export function writeSSEHeaders(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
}

export function writeSSE(res: Response) {
  return (data: any) => {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    res.write(`data: ${message}\n\n`);
  };
}

export function writeSSEEvent(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function closeSSE(res: Response) {
  res.write("data: [DONE]\n\n");
  res.end();
}