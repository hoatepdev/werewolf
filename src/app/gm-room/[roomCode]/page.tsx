'use client'
import React, { useEffect, useState, useCallback, useRef, use } from 'react'
import { getSocket } from '@/lib/socket'
import { useRouter } from 'next/navigation'
import { CornerUpLeft, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MockDataPanel } from '@/components/MockDataPanel'
import { Socket } from 'socket.io-client'
import { useRoomStore } from '@/hook/useRoomStore'

interface AudioEvent {
  type:
    | 'nightStart'
    | 'roleWake'
    | 'roleSleep'
    | 'nightEnd'
    | 'gameEnded'
    | 'nightAction'
    | 'phaseChange'
  role?: 'werewolf' | 'seer' | 'witch' | 'bodyguard'
  message: string
  timestamp?: number
  data?: NightActionData | { phase: string }
}

interface NightActionData {
  step: string
  action: string
  message: string
  timestamp: number
}

function useAudioQueue() {
  const isPlayingRef = useRef(false)
  const [currentAudio, setCurrentAudio] = useState<AudioEvent | null>(null)
  const [audioQueue, setAudioQueue] = useState<AudioEvent[]>([])

  console.log('🔊 currentAudio', currentAudio)
  console.log('🔊 audioQueue', audioQueue)

  const addToQueue = useCallback((audioEvent: AudioEvent) => {
    setCurrentAudio(audioEvent)
    setAudioQueue((prev) => [...prev, audioEvent])
  }, [])

  const processQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueue.length === 0) return
    isPlayingRef.current = true
    const message = audioQueue[0].message
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.lang = 'vi-VN'
      utterance.rate = 0.8
      utterance.pitch = 1.0
      utterance.volume = 1.0
      utterance.onend = () => {
        setTimeout(() => {
          isPlayingRef.current = false
          setCurrentAudio(audioQueue[1])
          setAudioQueue((prev) => prev.slice(1))
        }, 1000)
      }
      utterance.onerror = () => {
        setTimeout(() => {
          isPlayingRef.current = false
          setCurrentAudio(audioQueue[1])
          setAudioQueue((prev) => prev.slice(1))
        }, 1000)
      }
      speechSynthesis.speak(utterance)
    } else {
      alert(message)
      setTimeout(() => {
        isPlayingRef.current = false
        setCurrentAudio(audioQueue[1])
        setAudioQueue((prev) => prev.slice(1))
      }, 1000)
    }
  }, [audioQueue])

  useEffect(() => {
    if (!isPlayingRef.current && audioQueue.length > 0) {
      processQueue()
    }
  }, [audioQueue, processQueue])

  return {
    addToQueue,
    audioQueue,
    currentAudio,
    isPlayingRef,
    setCurrentAudio,
    setAudioQueue,
  }
}

const useSocketConnection = (
  roomCode: string,
  socket: Socket,
  addToQueue: (audioEvent: AudioEvent) => void,
  setCurrentAudio: (audioEvent: AudioEvent) => void,
) => {
  const [isConnected, setIsConnected] = useState(false)

  const { phase, setPhase } = useRoomStore()

  const [nightActions, setNightActions] = useState<NightActionData[]>([])
  const [nightResult, setNightResult] = useState<{
    diedPlayerIds: string[]
    cause: string
  } | null>(null)

  useEffect(() => {
    const gmRoomId = `gm_${roomCode}`

    socket.emit('rq_gm:connectGmRoom', { roomCode, gmRoomId })

    const handlers = {
      'gm:connected': (data: {
        roomCode: string
        gmRoomId: string
        message: string
      }) => {
        setIsConnected(true)
        toast.success('GM đã kết nối thành công')
      },
      'game:phaseChanged': (data: {
        phase: 'night' | 'day' | 'voting' | 'ended'
      }) => {
        setPhase(data.phase)
      },

      'gm:nightAction': (nightAction: NightActionData) => {
        setNightActions((prev) => [...prev, nightAction])
        addToQueue({
          type: 'nightAction',
          message: nightAction.message,
        })
      },
      'game:nightResult': (data: {
        diedPlayerIds: string[]
        cause: string
      }) => {
        setNightResult(data)
        addToQueue({
          type: 'nightEnd',
          message: 'Mời mọi người bàn luận',
        })
      },
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.keys(handlers).forEach((event) => socket.off(event))
    }
  }, [roomCode])

  const handleNextPhase = () => {
    socket.emit('rq_gm:nextPhase', { roomCode })
  }

  return {
    isConnected,
    phase,
    nightActions,
    nightResult,
    handleNextPhase,
    setCurrentAudio,
  }
}

const AudioControl = ({
  currentAudio,
  isPlaying,
  stopAudio,
}: {
  currentAudio: AudioEvent | null
  isPlaying: boolean
  stopAudio: () => void
}) => (
  <div className="rounded-lg bg-gray-800 p-6">
    <h2 className="mb-4 text-lg font-bold text-yellow-400">
      🎵 Điều khiển âm thanh
    </h2>
    {currentAudio ? (
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔊</span>
        <div className="flex-1">
          <p className="font-semibold text-white">{currentAudio.message}</p>
          {currentAudio.role && (
            <p className="text-sm text-gray-400">Vai: {currentAudio.role}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="text-sm text-green-400">Đang phát...</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Sẵn sàng</span>
          )}
          <button
            onClick={stopAudio}
            className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-700"
          >
            Dừng
          </button>
        </div>
      </div>
    ) : (
      <p className="text-gray-400">Không có âm thanh đang phát</p>
    )}
  </div>
)

const AudioQueue = ({
  audioQueue,
  playAudio,
}: {
  audioQueue: AudioEvent[]
  playAudio: (audio: AudioEvent | null) => void
}) => (
  <div className="rounded-lg bg-gray-800 p-6">
    <h2 className="mb-4 text-lg font-bold text-blue-400">
      📋 Hàng đợi âm thanh
    </h2>
    {audioQueue.length > 0 ? (
      <div className="space-y-2">
        {audioQueue.map((audio: AudioEvent, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg bg-gray-700 p-3"
          >
            <span className="text-lg">🔊</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{audio.message}</p>
              {audio.role && (
                <p className="text-xs text-gray-400">{audio.role}</p>
              )}
            </div>
            <button
              onClick={() => playAudio(audio)}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium hover:bg-blue-700"
            >
              Phát
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-400">Không có âm thanh trong hàng đợi</p>
    )}
  </div>
)

const NightActionLog = ({
  nightActions,
}: {
  nightActions: NightActionData[]
}) => (
  <div className="rounded-lg bg-gray-800 p-6">
    <h2 className="mb-4 text-lg font-bold text-blue-400">
      🌙 Nhật ký hành động đêm
    </h2>
    <div className="max-h-96 space-y-2 overflow-y-auto">
      {nightActions.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có hành động đêm nào...</p>
      ) : (
        nightActions.map((action, index) => (
          <div key={index} className="rounded bg-gray-700 p-3">
            <p className="text-sm font-medium text-white">{action.message}</p>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(action.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))
      )}
    </div>
  </div>
)

const GmRoomPage = ({ params }: { params: Promise<{ roomCode: string }> }) => {
  const socket = getSocket()
  const router = useRouter()
  const { roomCode } = use(params)
  const [showMockPanel, setShowMockPanel] = useState(false)

  const {
    isPlayingRef,
    audioQueue,
    currentAudio,
    addToQueue,
    setCurrentAudio,
  } = useAudioQueue()

  const { isConnected, phase, nightActions, nightResult, handleNextPhase } =
    useSocketConnection(roomCode, socket, addToQueue, setCurrentAudio)

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col bg-zinc-900 px-4 py-6 text-white">
      <div className="mb-6 flex h-10 items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => router.push('/create-room')}>
            <CornerUpLeft className="h-6 w-6 cursor-pointer text-gray-400" />
          </button>
          <h1 className="ml-2 text-xl font-bold">{roomCode}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="text-zinc-400 transition-colors hover:text-yellow-400"
            onClick={() => setShowMockPanel(!showMockPanel)}
          >
            <Settings className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="mb-2 text-lg font-bold text-purple-400">
          🎮 Điều khiển game
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="yellow" onClick={handleNextPhase} className="w-1/2">
            Giai đoạn tiếp theo
          </Button>
          <Button
            className="w-1/2"
            onClick={() =>
              addToQueue({
                type: 'nightAction',
                message: 'Kiểm tra âm thanh',
              })
            }
          >
            Kiểm tra âm thanh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NightActionLog nightActions={nightActions} />
        <AudioControl
          currentAudio={currentAudio}
          isPlaying={isPlayingRef.current}
          stopAudio={() => setCurrentAudio(null)}
        />
        <AudioQueue audioQueue={audioQueue} playAudio={setCurrentAudio} />
      </div>

      <MockDataPanel
        isVisible={showMockPanel}
        toggleMockDataPanel={() => setShowMockPanel(!showMockPanel)}
      />
    </main>
  )
}

export default GmRoomPage
