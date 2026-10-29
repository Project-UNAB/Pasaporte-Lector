import { useEffect, useRef, useState } from 'react'
import { Pasos } from '../componentes/Pasos'
import { useJuego, type EstadoServidor } from '../juego'
import { mensajeError } from '../lib/errores'
import { capturarFoto } from '../lib/foto'
import { supabase } from '../lib/supabase'
import './foto.css'

type Fase = 'consejos' | 'camara' | 'revisar' | 'subiendo'

export function Foto() {
  const { sesion, aplicar } = useJuego()
  const video = useRef<HTMLVideoElement>(null)
  const flujo = useRef<MediaStream | null>(null)
  const [fase, setFase] = useState<Fase>('consejos')
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState('')

  const detener = () => {
    flujo.current?.getTracks().forEach((t) => t.stop())
    flujo.current = null
  }

  useEffect(() => detener, [])
  // Si la persona cambia de app, apagar la cámara (en iPhone el indicador queda encendido).
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden' && flujo.current) {
        detener()
        setFase((f) => (f === 'camara' ? 'consejos' : f))
      }
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => document.removeEventListener('visibilitychange', alOcultar)
  }, [])
  useEffect(() => {
    if (fase === 'camara' && video.current && flujo.current) {
      video.current.srcObject = flujo.current
      video.current.play().catch(() => {})
    }
  }, [fase])
  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.url)
  }, [foto])

  async function abrirCamara() {
    setError('')
    if (!window.isSecureContext) {
      setError('La cámara solo funciona si la página abre con https://. Revisa la dirección e intenta de nuevo.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no permite usar la cámara. Abre la página en Chrome (Android) o Safari (iPhone).')
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      flujo.current = s
      setFase('camara')
    } catch (err) {
      const nombre = err instanceof DOMException ? err.name : ''
      setError(
        nombre === 'NotAllowedError'
          ? /iPhone|iPad/.test(navigator.userAgent)
            ? 'La cámara está bloqueada para esta página. Toca «aA» en la barra de direcciones → Configuración del sitio web → Cámara → Permitir, y vuelve a intentar.'
            : 'La cámara está bloqueada para esta página. Toca el ícono a la izquierda de la dirección → Permisos → Cámara → Permitir, y vuelve a intentar.'
          : nombre === 'NotFoundError'
            ? 'No encontramos una cámara en este dispositivo.'
            : 'No pudimos abrir la cámara. Cierra otras apps que la estén usando e intenta de nuevo.',
      )
    }
  }

  async function tomar() {
    if (!video.current || !video.current.videoWidth) return
    try {
      const blob = await capturarFoto(video.current)
      setFoto({ blob, url: URL.createObjectURL(blob) })
      detener()
      setFase('revisar')
    } catch {
      setError('No pudimos tomar la foto. Intenta de nuevo.')
    }
  }

  async function repetir() {
    setFoto(null)
    await abrirCamara()
  }

  async function usar() {
    if (!foto || !sesion) return
    setError('')
    setFase('subiendo')
    try {
      const { error } = await supabase.storage
        .from('fotos')
        .upload(`${sesion.user.id}/foto.jpg`, foto.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
      if (error) throw error
      const { data, error: err2 } = await supabase.rpc('guardar_foto')
      if (err2) throw err2
      aplicar(data as EstadoServidor)
    } catch (err) {
      setError(mensajeError(err))
      setFase('revisar')
    }
  }

  return (
    <main className="pantalla foto">
      <Pasos actual={3} />
      <h1 className="titulo">Tu foto de viajero</h1>
      <p className="mut">Se toma ahora con la cámara. Aparecerá en tu pasaporte.</p>

      <div className={`ovalo${fase === 'camara' ? ' vivo' : ''}`}>
        {fase === 'camara' && <video ref={video} playsInline muted autoPlay />}
        {(fase === 'revisar' || fase === 'subiendo') && foto && <img src={foto.url} alt="Tu foto" />}
        {fase === 'consejos' && <span aria-hidden="true">🙂</span>}
      </div>

      {fase === 'consejos' && (
        <div>
          <div className="tip">
            <b>💡</b> Busca luz de frente
          </div>
          <div className="tip">
            <b>🧢</b> Sin gorra ni gafas oscuras
          </div>
          <div className="tip">
            <b>🎯</b> Rostro centrado en el óvalo
          </div>
        </div>
      )}

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <div className="pie">
        {fase === 'consejos' && (
          <button className="btn" onClick={abrirCamara}>
            Abrir cámara
          </button>
        )}
        {fase === 'camara' && (
          <button className="btn dorado" onClick={tomar}>
            Tomar foto
          </button>
        )}
        {(fase === 'revisar' || fase === 'subiendo') && (
          <>
            <button className="btn" onClick={usar} disabled={fase === 'subiendo'}>
              {fase === 'subiendo' ? 'Guardando…' : 'Usar esta foto'}
            </button>
            <button className="btn suave" onClick={repetir} disabled={fase === 'subiendo'}>
              Repetir
            </button>
          </>
        )}
      </div>
    </main>
  )
}
