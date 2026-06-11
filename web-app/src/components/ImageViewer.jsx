import { useState } from 'react'
import { X } from 'lucide-react'

function ImageViewer({ src, alt }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="image-wrapper">
        <img
          src={src}
          alt={alt}
          onClick={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="image-modal" onClick={() => setIsOpen(false)}>
          <button className="close-modal" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
          <img src={src} alt={alt} />
        </div>
      )}
    </>
  )
}

export default ImageViewer
