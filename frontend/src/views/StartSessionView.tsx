import React, { useState, useEffect } from 'react';

type Props = {
  onSessionStarted: (session: { session_id: number; starting_warehouse_code: string | null }) => void;
  apiBase: string;
};

export default function StartSessionView({ onSessionStarted, apiBase }: Props) {
  const [box, setBox] = useState('');
  const [row, setRow] = useState('');
  const [pos, setPos] = useState('');
  
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<{ status: string; message?: string; next_available?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedCode, setDebouncedCode] = useState(code);

  // Combine box, row, pos into a single code string
  useEffect(() => {
    if (box && row && pos) {
      const paddedPos = pos.padStart(4, '0');
      const boxPart = box.toUpperCase() === 'P' ? 'P' : (box ? `${box}`: '');
      setCode(`K${boxPart}-R${row}-P${paddedPos}`);
    } else {
      setCode('');
    }
  }, [box, row, pos]);


  useEffect(() => {
    const handler = setTimeout(() => {
      // Only set the debounced code if all parts are present, or if all are empty
      if ((box && row && pos) || (!box && !row && !pos)) {
        setDebouncedCode(code);
      } else {
        // If the code is partial, don't trigger validation
        setDebouncedCode('');
        setValidation(null);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [code, box, row, pos]);

  useEffect(() => {
    if (debouncedCode) {
      validateCode(debouncedCode);
    } else {
      setValidation(null);
    }
  }, [debouncedCode, apiBase]);

  const validateCode = async (codeToValidate: string) => {
    try {
      const res = await fetch(`${apiBase}/inventory/check_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToValidate }),
      });
      const data = await res.json();
      if (res.ok) {
        setValidation({ status: 'available' });
      } else {
        setValidation({ status: data.status || 'error', message: data.message, next_available: data.next_available });
      }
    } catch (e) {
      setValidation({ status: 'error', message: 'Network error' });
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      // Use the combined code state for starting the session
      const res = await fetch(`${apiBase}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starting_warehouse_code: code || null }),
      });
      const sessionData = await res.json();
      if (res.ok) {
        onSessionStarted(sessionData);
      } else {
        setValidation({ status: 'error', message: sessionData.error || 'Failed to start session.' });
      }
    } catch (e) {
      setValidation({ status: 'error', message: 'Network error.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchNextCode = async () => {
    try {
      const res = await fetch(`${apiBase}/inventory/next_code`);
      const data = await res.json();
      if (res.ok && data.code) {
        // Parse K<box>-R<row>-P<pos>
        const match = data.code.match(/K(P|\d+)-R(\d+)-P(\d+)/);
        if (match) {
          setBox(match[1]);
          setRow(match[2]);
          setPos(match[3]);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // A code is valid if it's empty OR if it's filled and the backend says it's available.
  const isCodeValidForStart = !code || validation?.status === 'available';


  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 border border-gray-700 rounded-2xl shadow-lg">
        <div className="flex flex-col items-center text-center mb-4">
          <span className="material-symbols-outlined text-5xl text-primary mb-3">box</span>
          <h2 className="text-2xl font-bold text-white">Rozpocznij Skanowanie</h2>
          <p className="text-sm text-gray-400 mt-1">Wybierz lokalizację początkową, aby rozpocząć.</p>
        </div>
        <div>
          <div className="flex justify-between items-end">
            <label className="block text-sm font-medium text-gray-300">
              Lokalizacja (opcjonalnie)
            </label>
            <button onClick={handleFetchNextCode} className="text-xs text-primary hover:text-indigo-400 font-semibold">
              Użyj następnej wolnej
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 text-gray-300 bg-gray-900 border border-r-0 border-gray-600 rounded-l-md sm:text-sm">
                K
              </span>
              <input
                type="text"
                value={box}
                onChange={(e) => setBox(e.target.value.toUpperCase())}
                placeholder="10"
                className="flex-1 block w-full min-w-0 px-3 py-2 text-white placeholder-gray-500 bg-gray-700 border border-gray-600 rounded-none rounded-r-md shadow-sm appearance-none focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 text-gray-300 bg-gray-900 border border-r-0 border-gray-600 rounded-l-md sm:text-sm">
                R
              </span>
              <input
                type="number"
                value={row}
                onChange={(e) => setRow(e.target.value)}
                placeholder="4"
                className="flex-1 block w-full min-w-0 px-3 py-2 text-white placeholder-gray-500 bg-gray-700 border border-gray-600 rounded-none rounded-r-md shadow-sm appearance-none focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 text-gray-300 bg-gray-900 border border-r-0 border-gray-600 rounded-l-md sm:text-sm">
                P
              </span>
              <input
                type="number"
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                placeholder="1000"
                className="flex-1 block w-full min-w-0 px-3 py-2 text-white placeholder-gray-500 bg-gray-700 border border-gray-600 rounded-none rounded-r-md shadow-sm appearance-none focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
          </div>
          
          <div className="h-5 mt-2 text-sm text-center">
            {validation && (
              <>
                {validation.status === 'available' && <p className="text-green-400">Lokalizacja jest dostępna.</p>}
                {validation.status === 'taken' && <p className="text-red-400">Zajęta. Następna wolna: {validation.next_available}</p>}
                {validation.status === 'invalid_format' && <p className="text-yellow-400">{validation.message || 'Nieprawidłowy format.'}</p>}
                {validation.status === 'error' && <p className="text-red-400">{validation.message || 'Wystąpił błąd.'}</p>}
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleStartSession}
          disabled={!isCodeValidForStart || isLoading}
          className="w-full px-4 py-2 text-sm font-bold text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Rozpoczynam...' : 'Rozpocznij Skanowanie'}
        </button>
      </div>
    </div>
  );
}
