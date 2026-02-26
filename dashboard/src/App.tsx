import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';

type ShortenResponse = {
  shortUrl?: string;
  shortCode?: string;
  error?: string;
};

function App() {
  const [longUrl, setLongUrl] = useState('');
  const [result, setResult] = useState<{ shortUrl: string; shortCode: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CF_DOMAIN = import.meta.env.VITE_CF_DOMAIN ?? 'https://d1t3js0d226bzx.cloudfront.net';
  const SHORTEN_API = import.meta.env.VITE_SHORTEN_API ?? `${CF_DOMAIN}/shorten`;

  const shorten = async () => {
    if (!longUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(SHORTEN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl.trim() }),
      });

      if (!res.ok) throw new Error('API error');

      const data = (await res.json()) as ShortenResponse;
      if (data.shortUrl && data.shortCode) {
        setResult({ shortUrl: `${CF_DOMAIN}/${data.shortCode}`, shortCode: data.shortCode });
      } else {
        setError('Failed to shorten');
      }
    } catch (err) {
      setError('Network error - try again');
      console.error(err);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
      {/* Main Content - Perfectly Centered */}
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight">
          Global URL Shortener
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
          Shorten links with under 50ms global redirects
        </p>

        {/* Input + Button - Centered and wider */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
          <input
            type="url"
            placeholder="Paste your long URL here..."
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            className="flex-1 px-6 py-4 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg placeholder-gray-500"
            onKeyDown={(e) => e.key === 'Enter' && shorten()}
          />

          <button
            onClick={shorten}
            disabled={loading || !longUrl.trim()}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Shortening...
              </>
            ) : (
              'Shorten URL'
            )}
          </button>
        </div>

        {error && <p className="text-red-400 mt-6 text-lg">{error}</p>}

        {/* Result Section - Centered */}
        {result && (
          <div className="mt-12 bg-gray-900/50 border border-gray-800 rounded-2xl p-8 max-w-xl mx-auto">
            <p className="text-lg text-gray-300 mb-4">Your short link:</p>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-800 p-4 rounded-xl">
              <a
                href={result.shortUrl}
                target="_blank"
                className="text-blue-400 hover:text-blue-300 font-mono text-lg flex-1 break-all text-center sm:text-left"
              >
                {result.shortUrl}
              </a>

              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(result.shortUrl)}
                  className="p-3 hover:bg-gray-700 rounded-lg transition"
                  title="Copy link"
                >
                  <Copy size={22} />
                </button>
                <a
                  href={result.shortUrl}
                  target="_blank"
                  className="p-3 hover:bg-gray-700 rounded-lg transition"
                  title="Open in new tab"
                >
                  <ExternalLink size={22} />
                </a>
              </div>
            </div>

            {/* QR Code - Centered */}
            <div className="mt-8 flex justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-2xl">
                <QRCodeSVG value={result.shortUrl} size={220} level="H" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Credit */}
      <p className="mt-16 text-gray-600 text-sm">
        Built with AWS CDK, Lambda@Edge & Vite + React
      </p>
    </div>
  );
}

export default App;
