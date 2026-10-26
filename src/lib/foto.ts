/** Captura un cuadro del video, lo recorta en vertical 3:4 y lo comprime a JPEG (~60-100 KB). */
export async function capturarFoto(video: HTMLVideoElement, ancho = 480): Promise<Blob> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  const proporcion = 3 / 4
  let sw = vw
  let sh = vw / proporcion
  if (sh > vh) {
    sh = vh
    sw = vh * proporcion
  }
  const sx = (vw - sw) / 2
  const sy = (vh - sh) / 2
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = Math.round(ancho / proporcion)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('sin_canvas')
  // Espejo, igual que la vista previa de la cámara frontal.
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  for (const calidad of [0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', calidad))
    if (blob && (blob.size < 140_000 || calidad === 0.45)) return blob
  }
  throw new Error('sin_foto')
}
