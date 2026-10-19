import { Download, QrCode, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function TankQr({ tankId }) {
  const [open, setOpen] = useState(false)
  const qrRef = useRef(null)
  const url = `${window.location.origin}/tank/${encodeURIComponent(tankId)}`
  const download = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const anchor = document.createElement('a')
    anchor.download = `${tankId}-qr.png`
    anchor.href = canvas.toDataURL('image/png')
    anchor.click()
  }
  return <>
    <button className="secondary-button" onClick={() => setOpen(true)}><QrCode size={18} /> Tank QR</button>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><div className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={() => setOpen(false)}><X /></button><p className="kicker">PUBLIC ACCESS QR</p><h2>{tankId}</h2><p>Attach this QR to the tank to open its live dashboard.</p><div className="qr-box" ref={qrRef}><QRCodeCanvas value={url} size={220} level="H" marginSize={2} /></div><code>{url}</code><button className="primary-button full" onClick={download}><Download size={18} /> Download PNG</button></div></div>}
  </>
}
