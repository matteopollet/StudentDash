// Polyfills for pdfjs-dist in Node.js environments (like Vercel)
// pdfjs-dist requires DOMMatrix, Path2D, and ImageData for geometry calculations,
// even if we are only extracting text.

if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') {
    ;(global as any).DOMMatrix = class DOMMatrix {}
  }
  if (typeof (global as any).Path2D === 'undefined') {
    ;(global as any).Path2D = class Path2D {}
  }
  if (typeof (global as any).ImageData === 'undefined') {
    ;(global as any).ImageData = class ImageData {}
  }
}
