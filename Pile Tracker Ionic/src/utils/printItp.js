import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export async function printItp(elementId) {

  // ── WEB — unchanged ───────────────────────────────────────────
  if (!Capacitor.isNativePlatform()) {
    window.print();
    return;
  }

  // ── CAPACITOR — save PDF directly to device ───────────────────
  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF }       = await import('jspdf');

  const element = document.getElementById(elementId);
  if (!element) {
    alert('Nothing to print');
    return;
  }

  try {
    // ── fix 1: scroll element into view and make it fully visible
    element.scrollIntoView();
    const originalStyle = element.style.cssText;
    element.style.position   = 'absolute';
    element.style.left       = '0';
    element.style.top        = '0';
    element.style.zIndex     = '99999';
    element.style.background = '#ffffff';
    element.style.width      = '794px';   // A4 width at 96dpi

    // ── fix 2: wait for images to fully load inside the element
    const images = element.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload  = resolve;
        img.onerror = resolve;  // don't block if one fails
      });
    }));

    // ── fix 3: small delay to let DOM settle
    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    // restore element style
    element.style.cssText = originalStyle;

    // ── build PDF
    const pdf    = new jsPDF('p', 'mm', 'a4');
    const pageW  = pdf.internal.pageSize.getWidth();   // 210mm
    const pageH  = pdf.internal.pageSize.getHeight();  // 297mm
    const imgH   = (canvas.height * pageW) / canvas.width;

    let yOffset = 0;
    while (yOffset < imgH) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG', 0, -yOffset, pageW, imgH
      );
      yOffset += pageH;
    }

    // ── save directly to device — no share sheet
    const base64   = pdf.output('datauristring').split(',')[1];
    const fileName = `ITP-Pile-${Date.now()}.pdf`;

    await Filesystem.writeFile({
      path:      fileName,
      data:      base64,
      directory: Directory.Documents,  // saves to Files app on iOS, Documents on Android
    });

    alert(`Saved: ${fileName}\nFind it in your Files app.`);

  } catch (err) {
    console.error('PDF error:', err);
    alert('PDF failed: ' + err.message);
  }
}