'use client'

import QRCode from 'react-qr-code'

interface Props {
  value: string
  size?: number
}

export function EtimsQrCode({ value, size = 120 }: Props) {
  return <QRCode value={value} size={size} />
}
