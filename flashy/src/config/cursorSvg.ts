/**
 * Centralized cursor SVG definition
 * Customize the cursor shape here - changes will apply everywhere
 */

export function getCursorSvg(color: string): string {
  return `
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="
  
  M11.75 17.5
  
  
  
  L13 18.5
  C13.8321 19.1154 14.9154 18.8615 15.2857 18.0313L18.2815 11.4698C18.6518 10.6396 18.1606 9.67891 17.2518 9.53429L8.3871 8.16507

  C7.4 8.02045 6.71766 8.79742 6.94815 9.68484

  L7.7 13.5
  C7.7 14 8 14.3 9 15.2
  z
  
  
  " fill="${color}" stroke="black" stroke-width="0" transform="scale(1.8) translate(-6, -7)"/>    
                
      </svg>
  `.trim();
}

export function getCursorDataUrl(color: string): string {
  const svg = getCursorSvg(color);
  return 'data:image/svg+xml;base64,' + btoa(svg);
}
