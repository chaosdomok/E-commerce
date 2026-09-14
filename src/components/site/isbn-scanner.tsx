'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Zadeklaruj typy, ponieważ BarcodeDetector może nie być w standardowych typach TS.
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

export function IsbnScanner({ onScan }: { onScan: (isbn: string) => void }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      // Opcjonalnie sprawdź czy format 'ean_13' jest wspierany
      window.BarcodeDetector.getSupportedFormats()
        .then((supportedFormats: string[]) => {
          if (supportedFormats.includes('ean_13')) {
            setIsSupported(true);
          }
        })
        .catch(() => {
          // Fallback, pozwól spróbować
          setIsSupported(true);
        });
    }
  }, []);

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      setError('Brak dostępu do kamery.');
    }
  };

  useEffect(() => {
    if (isScanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      
      const detector = new window.BarcodeDetector({ formats: ['ean_13'] });
      let animationFrameId: number;

      const detect = async () => {
        if (!videoRef.current || !isScanning) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const isbn = barcodes[0].rawValue;
            onScan(isbn);
            stopScanner();
            return;
          }
        } catch (e) {
          // Ignore intermittent detection errors
        }
        animationFrameId = requestAnimationFrame(detect);
      };

      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        detect();
      };

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [isScanning, onScan]);

  useEffect(() => {
    return () => stopScanner();
  }, []);

  if (!isSupported) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto flex items-center gap-2"
        onClick={isScanning ? stopScanner : startScanner}
      >
        <Camera className="size-4" />
        {isScanning ? 'Anuluj skanowanie' : 'Skanuj kod kreskowy'}
      </Button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {isScanning && (
        <div className="relative mt-2 rounded-xl overflow-hidden bg-black/10 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-48 object-cover rounded-xl"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-48 h-24 border-2 border-red-500 rounded-lg"></div>
            <p className="text-white text-sm bg-black/50 px-2 py-1 mt-2 rounded shadow">
              Umieść kod w ramce
            </p>
          </div>
        </div>
      )}
    </>
  );
}
