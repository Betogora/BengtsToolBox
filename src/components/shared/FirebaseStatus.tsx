import { Cloud, CloudOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

type FirebaseStatusProps = {
  isRealtime: boolean
}

export function FirebaseStatus({ isRealtime }: FirebaseStatusProps) {
  return (
    <Badge variant={isRealtime ? 'default' : 'secondary'} className="gap-2">
      {isRealtime ? (
        <Cloud className="size-3.5" />
      ) : (
        <CloudOff className="size-3.5" />
      )}
      {isRealtime ? 'Firestore live' : 'Lokaler Demo-Modus'}
    </Badge>
  )
}
