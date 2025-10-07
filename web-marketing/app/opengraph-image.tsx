import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Cerply – Learn anything. Remember everything.';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: '#FAF7F2',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
          padding: '80px',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#1E1B16',
            textAlign: 'center',
            marginBottom: '32px',
            lineHeight: 1.2,
          }}
        >
          Learn anything.
          <br />
          Remember everything.
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#5F574D',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Turn policies, regs, notes and transcripts into bite-size, spaced, adaptive learning.
        </div>
        <div
          style={{
            marginTop: '48px',
            fontSize: 40,
            fontWeight: 'bold',
            color: '#F06B54',
          }}
        >
          Cerply
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

