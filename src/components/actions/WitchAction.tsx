import React, { useState, useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { NightPrompt, useRoomStore } from '@/hook/useRoomStore'
import { toast } from 'sonner'
import { PlayerGrid } from '../PlayerGrid'
import { Button } from '../ui/button'
import Waiting from '../phase/Waiting'

interface WitchActionProps {
  roomCode: string
}

const WitchAction: React.FC<WitchActionProps> = ({ roomCode }) => {
  const socket = getSocket()
  const { nightPrompt, setNightPrompt, approvedPlayers } = useRoomStore()
  const [heal, setHeal] = useState<boolean>(false)
  const [selectedTarget, setSelectedTarget] = useState<{
    id: string
    username: string
  }>()
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const handler = (data: NightPrompt) => {
      console.log('⭐ witch data', data)
      setNightPrompt(data)
    }
    socket.on('night:witch-action', handler)
    return () => {
      socket.off('night:witch-action', handler)
    }
  }, [])

  const handleAction = async () => {
    setSending(true)

    socket.emit('night:witch-action:done', {
      roomCode,
      heal,
      poisonTargetId: selectedTarget?.id,
    })
    toast.success('Đã gửi lựa chọn')
  }

  const handleSelectPlayer = (player: { id: string; username: string }) => {
    setSelectedTarget(player)
  }

  if (!nightPrompt || nightPrompt.type !== 'witch' || sending) {
    return <Waiting />
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-purple-400">🧙‍♀️ Lượt Phù thủy</h3>
        <p className="text-sm text-gray-300">{nightPrompt.message}</p>
      </div>
      <div className="w-full">
        <PlayerGrid
          players={approvedPlayers}
          mode="room"
          selectedId={selectedTarget?.id}
          onSelect={handleSelectPlayer}
          selectableList={nightPrompt.candidates}
        />
      </div>
      {nightPrompt?.killedPlayerId && (
        <div className="flex w-full items-center justify-between rounded-lg bg-red-900/20 p-3">
          <p className="text-sm text-red-300">
            Người bị sói cắn:{' '}
            <span className="font-semibold">
              {
                nightPrompt.candidates?.find(
                  (p) => p.id === nightPrompt.killedPlayerId,
                )?.username
              }
            </span>
          </p>
          {nightPrompt.canHeal && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <input
                type="checkbox"
                checked={heal}
                onChange={(e) => setHeal(e.target.checked)}
                className="rounded"
              />
              Cứu
            </label>
          )}
        </div>
      )}

      {selectedTarget?.id && (
        <div className="w-full rounded-lg bg-gray-800 p-3">
          <div className="text-gray-300">
            Bạn sẽ đầu độc: &nbsp;
            <span className="font-semibold text-purple-400">
              {selectedTarget?.username}
            </span>
          </div>
        </div>
      )}

      <button
        className="w-full rounded-lg bg-zinc-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
        onClick={() => handleAction()}
      >
        Bỏ qua (không cứu/đầu độc)
      </button>

      <Button
        onClick={handleAction}
        disabled={!selectedTarget?.id && !heal}
        variant="yellow"
      >
        Xác nhận
      </Button>
    </div>
  )
}

export default WitchAction
