export function renderMessageBlock(messageHtml?: string) {
  if (!messageHtml) return '';

  return `
    <div style="margin-top:16px;font-size:15px;line-height:26px;color:#e5e7eb;">
      ${messageHtml}
    </div>
  `;
}