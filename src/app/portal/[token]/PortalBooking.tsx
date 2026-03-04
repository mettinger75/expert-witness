'use client'

import { useState } from 'react'
import { Phone, Gavel } from 'lucide-react'

type BookingType = 'call' | 'deposition'

const BOOKING_URLS: Record<BookingType, string> = {
  call: 'https://book.morgen.so/markettingermd/expertcall',
  deposition: 'https://book.morgen.so/markettingermd/expertdeposition',
}

export function PortalBooking() {
  const [activeType, setActiveType] = useState<BookingType>('call')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#0E1F35]">
          Schedule a Call or Deposition
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Select a booking type below and choose an available time directly from
          Dr. Ettinger&apos;s calendar.
        </p>
      </div>

      {/* Booking type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveType('call')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeType === 'call'
              ? 'bg-[#0E1F35] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Phone className="h-4 w-4" />
          Expert Call
        </button>
        <button
          onClick={() => setActiveType('deposition')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeType === 'deposition'
              ? 'bg-[#0E1F35] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Gavel className="h-4 w-4" />
          Deposition
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600">
        {activeType === 'call'
          ? 'Schedule a consultation call to discuss case details, strategy, or expert opinions.'
          : 'Schedule a deposition session. Please ensure all parties are notified of the selected date.'}
      </p>

      {/* Embedded booking iframe */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <iframe
          key={activeType}
          src={BOOKING_URLS[activeType]}
          className="w-full border-0"
          style={{ height: '680px' }}
          title={`Book ${activeType === 'call' ? 'Expert Call' : 'Deposition'}`}
          allow="payment"
        />
      </div>
    </div>
  )
}
