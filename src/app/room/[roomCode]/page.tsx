'use client'
import React, { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'
import { toast } from 'sonner'
import {
  getStateRoomStore,
  NightResult,
  useRoomStore,
} from '@/hook/useRoomStore'
import { Player } from '@/types/player'
import NightPhase from '@/components/phase/NightPhase'
import DayPhase from '@/components/phase/DayPhase'
import PhaseTransition from '@/components/PhaseTransition'
import VotingPhase from '@/components/phase/VotingPhase'
import GameEnd from '@/components/GameEnd'
import Waiting from '@/components/phase/Waiting'

const RoomPage = ({ params }: { params: Promise<{ roomCode: string }> }) => {
  const socket = getSocket()

  const { roomCode } = React.use(params)

  const [nightResult, setNightResult] = useState<NightResult | null>(null)
  const [gameWinner, setGameWinner] = useState<string | null>(null)

  const {
    playerId,
    phase,
    setPhase,
    approvedPlayers,
    setApprovedPlayers,
    setAlive,
    setNightPrompt,
    alive,
  } = useRoomStore()

  console.log('⭐ store', getStateRoomStore())

  useEffect(() => {
    socket.on('game:phaseChanged', (newPhase: { phase: string }) => {
      setPhase(newPhase.phase as 'night' | 'day' | 'voting' | 'ended')
      setNightPrompt(null)
    })

    socket.on('game:nightResult', ({ diedPlayerIds, cause }: NightResult) => {
      console.log('⭐ game:nightResult', diedPlayerIds, cause)
      setNightResult({ diedPlayerIds, cause })

      const newApprovedPlayers: Player[] = [...approvedPlayers]

      diedPlayerIds.forEach((p) => {
        const foundPlayerIndex = approvedPlayers.findIndex(
          (player) => player.id === p,
        )
        if (foundPlayerIndex !== -1) {
          newApprovedPlayers[foundPlayerIndex].alive = false
        }
        if (p === playerId) {
          setAlive(false)
        }
      })
      console.log('⭐ newApprovedPlayers', newApprovedPlayers)

      setApprovedPlayers(newApprovedPlayers)
    })

    socket.on('game:hunterShoot', ({ hunterId }: { hunterId: string }) => {
      console.log('⭐ game:hunterShoot', hunterId)
      toast.info('Thợ săn đã bắn!')
    })

    socket.on(
      'game:gameEnded',
      ({ winner }: { winner: 'villagers' | 'werewolves' }) => {
        console.log('⭐ game:gameEnded', winner)
        setGameWinner(winner === 'villagers' ? 'Dân làng' : 'Sói')
      },
    )

    return () => {
      socket.off('game:phaseChanged')
      socket.off('game:nightResult')
      socket.off('game:hunterShoot')
      socket.off('game:gameEnded')
    }
  }, [])

  const renderPhase = () => {
    if (!alive) return <Waiting />
    if (gameWinner) {
      return (
        <GameEnd
          winningTeam={gameWinner}
          players={approvedPlayers}
          onReturn={() => (window.location.href = '/')}
          onPlayAgain={() => window.location.reload()}
        />
      )
    }

    switch (phase) {
      case 'night':
        return <NightPhase roomCode={roomCode} />
      case 'day':
        return <DayPhase nightResult={nightResult} />
      case 'voting':
        return <VotingPhase />
      default:
        return <div>null</div>
    }
  }

  return <PhaseTransition phase={phase}>{renderPhase()}</PhaseTransition>
}

export default RoomPage
