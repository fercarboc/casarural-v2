import React from 'react'
import { Outlet } from 'react-router-dom'

export default function BookingFlowLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
      <Outlet />
    </div>
  )
}