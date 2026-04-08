export function renderSection(innerHtml: string) {
  return `
    <tr>
      <td style="padding:0 32px 20px 32px;">
        <div style="border:1px solid #1f2937;border-radius:18px;background:#0b1220;padding:24px;">
          ${innerHtml}
        </div>
      </td>
    </tr>
  `;
}