import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#059669', // Emerald-600
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22px', // More rounded for Apple icons
        }}
      >
        {/* Bank Building Icon - Larger for Apple icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bank Roof Triangle */}
          <path
            d="M12 3L3 8v1h18V8L12 3z"
            fill="white"
          />
          {/* Bank Columns */}
          <rect x="5" y="9" width="2" height="8" fill="white" />
          <rect x="9" y="9" width="2" height="8" fill="white" />
          <rect x="13" y="9" width="2" height="8" fill="white" />
          <rect x="17" y="9" width="2" height="8" fill="white" />
          {/* Bank Base */}
          <rect x="3" y="17" width="18" height="2" fill="white" />
          {/* Bank Steps */}
          <rect x="2" y="19" width="20" height="1" fill="white" opacity="0.8" />
          {/* Add dollar sign in the center */}
          <text
            x="12"
            y="14"
            fontSize="6"
            fill="white"
            textAnchor="middle"
            fontWeight="bold"
          >
            $
          </text>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}