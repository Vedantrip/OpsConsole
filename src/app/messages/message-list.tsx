"use client";

import MessageTimestamp from "./message-timestamp";

type Message = { id: string; senderName: string; own: boolean; body: string; createdAt: string };

export default function MessageList({ messages }: { messages: Message[] }) {
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });
  let previousDate = "";

  return <div className="space-y-5">
    {messages.map((message) => {
      const messageDate = new Date(message.createdAt);
      const dateKey = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }).format(messageDate);
      const showDate = dateKey !== previousDate;
      previousDate = dateKey;

      return <div key={message.id}>
        {showDate && <div className="my-2 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.12em] text-muted"><span className="h-px flex-1 bg-line" /><span>{dateFormatter.format(messageDate)}</span><span className="h-px flex-1 bg-line" /></div>}
        <div className={`flex ${message.own ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] ${message.own ? "items-end" : "items-start"} flex flex-col`}>
            <span className="mb-1 text-[10px] font-mono text-muted">{message.senderName}</span>
            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.own ? "rounded-br-sm bg-ink text-paper" : "rounded-bl-sm bg-paper border border-line text-ink"}`}>{message.body}</div>
            <MessageTimestamp value={message.createdAt} />
          </div>
        </div>
      </div>;
    })}
  </div>;
}