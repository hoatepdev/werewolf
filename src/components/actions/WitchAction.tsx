import React, { useState, useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { NightPrompt, useRoomStore } from '@/hook/useRoomStore'
import { toast } from 'sonner'

interface WitchActionProps {
  roomCode: string
}

const WitchAction: React.FC<WitchActionProps> = ({ roomCode }) => {
  const socket = getSocket()
  const { nightPrompt, setNightPrompt } = useRoomStore()
  const [heal, setHeal] = useState<boolean>(false)
  const [poisonTarget, setPoisonTarget] = useState<string | null>(null)
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
  }, [socket])

  if (!nightPrompt || nightPrompt.type !== 'witch') {
    return null
  }

  const handleAction = async () => {
    setSending(true)

    socket.emit('night:witch-action:done', {
      roomCode,
      heal,
      poisonTargetId: poisonTarget,
    })
    toast.success('Đã gửi lựa chọn')
  }

  const killedPlayer = nightPrompt.candidates?.find(
    (p) => p.id === nightPrompt.killedPlayerId,
  )

  const poisonTargetPlayer = nightPrompt.candidates?.find(
    (p) => p.id === poisonTarget,
  )

  if (sending) {
    return null
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-lg bg-gray-900 p-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-purple-400">🧙‍♀️ Lượt Phù thủy</h3>
        <p className="text-sm text-gray-300">{nightPrompt.message}</p>
      </div>

      {nightPrompt.killedPlayerId && (
        <div className="flex w-full items-center justify-between rounded-lg bg-red-900/20 p-3">
          <p className="text-sm text-red-300">
            Người bị sói cắn:{' '}
            <span className="font-semibold">{killedPlayer?.username}</span>
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

      {nightPrompt.canPoison && (
        <div className="w-full space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Chọn người để đầu độc (tùy chọn):
          </label>
          <div className="grid grid-cols-3 gap-2">
            {nightPrompt.candidates?.map((player) => (
              <button
                key={player.id}
                onClick={() =>
                  setPoisonTarget(poisonTarget === player.id ? null : player.id)
                }
                className={`rounded-lg p-3 text-sm font-medium transition-colors ${
                  poisonTarget === player.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {player.username}
              </button>
            ))}
          </div>
        </div>
      )}

      {poisonTarget && (
        <div className="w-full rounded-lg bg-gray-800 p-3">
          <p className="text-sm text-gray-300">
            Bạn sẽ đầu độc:{' '}
            <span className="font-semibold text-purple-400">
              {poisonTargetPlayer?.username}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={handleAction}
        disabled={!poisonTarget && !heal}
        className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        Xác nhận
      </button>
    </div>
  )
}

export default WitchAction
