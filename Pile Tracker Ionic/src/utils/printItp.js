import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function printItp(elementId) {
  
  // ── WEB — keep exactly as it was ──────────────────────────────
  if (!Capacitor.isNativePlatform()) {
    window.print();
    return;
  }

  // ── CAPACITOR — generate PDF and open native share/print ──────
  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF }       = await import('jspdf');

  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,           // needed for photos from your server
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData   = canvas.toDataURL('image/jpeg', 0.92);
    const pdf       = new jsPDF('p', 'mm', 'a4');
    const pageW     = pdf.internal.pageSize.getWidth();
    const pageH     = pdf.internal.pageSize.getHeight();
    const imgH      = (canvas.height * pageW) / canvas.width;

    // if ITP is taller than one A4 page, split across pages
    let yOffset = 0;
    while (yOffset < imgH) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -yOffset, pageW, imgH);
      yOffset += pageH;
    }

    const base64    = pdf.output('datauristring').split(',')[1];
    const fileName  = `ITP-Pile-${Date.now()}.pdf`;

    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: 'ITP Report',
      url: saved.uri,
      dialogTitle: 'Print or share ITP report',
    });

  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Could not generate PDF: ' + err.message);
  }
}