'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

interface CommandPaletteProps {
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ books, isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.course_code && book.course_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredBooks.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredBooks.length) % filteredBooks.length);
      } else if (e.key === 'Enter' && filteredBooks.length > 0) {
        e.preventDefault();
        router.push(`/book/${filteredBooks[selectedIndex].id}`);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredBooks, selectedIndex, router, onClose]);

  const handleBookSelect = (book: Book) => {
    router.push(`/book/${book.id}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center border-b border-zinc-800 px-4">
            <Search className="h-5 w-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj podręczników..."
              className="flex-1 bg-transparent px-4 py-4 text-white placeholder-zinc-500 outline-none"
            />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredBooks.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                Brak wyników dla "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-1">
                {filteredBooks.map((book, index) => (
                  <button
                    key={book.id}
                    onClick={() => handleBookSelect(book)}
                    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-sue/10 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50'
                    }`}
                  >
                    {/* Book Cover Thumbnail */}
                    <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                          <Search className="h-4 w-4 text-zinc-600" />
                        </div>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {book.title}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {book.author}
                      </p>
                    </div>

                    {/* Subject */}
                    {book.course_code && (
                      <span className="flex-shrink-0 rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-400">
                        {book.course_code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {filteredBooks.length} {filteredBooks.length === 1 ? 'wynik' : 'wyników'}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">↑↓</kbd>
                  <span>Nawiguj</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">↵</kbd>
                  <span>Otwórz</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">esc</kbd>
                  <span>Zamknij</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
