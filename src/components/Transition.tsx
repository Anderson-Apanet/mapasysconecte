import { Transition as HeadlessTransition } from '@headlessui/react'
import React from 'react'

interface TransitionProps {
  show: boolean
  enter: string
  enterFrom: string
  enterTo: string
  leave: string
  leaveFrom: string
  leaveTo: string
  className?: string
  children: React.ReactNode
}

export const Transition: React.FC<TransitionProps> = ({
  show,
  enter,
  enterFrom,
  enterTo,
  leave,
  leaveFrom,
  leaveTo,
  className,
  children,
}) => {
  return (
    <HeadlessTransition
      show={show}
      enter={enter}
      enterFrom={enterFrom}
      enterTo={enterTo}
      leave={leave}
      leaveFrom={leaveFrom}
      leaveTo={leaveTo}
      className={className}
    >
      {children}
    </HeadlessTransition>
  )
}
