'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { compressImage } from '@/lib/client/compress-image';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Send,
  Camera,
} from 'lucide-react';
import { BookCover, formatPrice } from '@/components/site/book-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchIsbnSuggestions, IsbnSuggestion } from '@/lib/frontend/isbn';
import {
  submitBooksBatch,
  uploadBookCover,
  BookSubmissionItem,
} from '@/lib/frontend/submit-books';
import { toast } from 'sonner';
import { parseWholePln } from '@/lib/money';
import { IsbnScanner } from './isbn-scanner';

export function UserBookWizard() {
  const router = useRouter();
  const [isSubmitting, startSubmitting] = useTransition();

  // Current book form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [condition, setCondition] = useState('DOBRY');
  const [courseCode, setCourseCode] = useState('Matematyka');
  const [price, setPrice] = useState<number | ''>('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [coverError, setCoverError] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCompressingCover, setIsCompressingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ISBN search suggestions
  const [suggestions, setSuggestions] = useState<IsbnSuggestion[]>([]);
  const [isSearchingIsbn, setIsSearchingIsbn] = useState(false);

  // Queue of books to submit in this session
  const [queue, setQueue] = useState<BookSubmissionItem[]>([]);
  const [foundBook, setFoundBook] = useState(false);
  const isbnRequest = useRef(0);

  useEffect(
    () => () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    },
    [coverPreviewUrl],
  );

  // Live price calculation for current input
  const numPrice = typeof price === 'number' ? price : 0;

  const handleIsbnChange = async (val: string) => {
    setIsbn(val);
    setFoundBook(false);
    const request = ++isbnRequest.current;
    if (val.trim().length >= 3) {
      setIsSearchingIsbn(true);
      try {
        const results = await searchIsbnSuggestions(val);
        if (request === isbnRequest.current) setSuggestions(results);
      } catch {
        if (request === isbnRequest.current) setSuggestions([]);
      } finally {
        if (request === isbnRequest.current) setIsSearchingIsbn(false);
      }
    } else {
      setIsSearchingIsbn(false);
      setSuggestions([]);
    }
  };

  const applySuggestion = (s: IsbnSuggestion) => {
    ++isbnRequest.current;
    setIsSearchingIsbn(false);
    setFoundBook(true);
    setIsbn(s.isbn);
    setTitle(s.title);
    setAuthor(s.author);
    setSuggestions([]);
  };

  const resetCurrentForm = () => {
    ++isbnRequest.current;
    setIsSearchingIsbn(false);
    setFoundBook(false);
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCondition('DOBRY');
    setPrice('');
    setCoverUrl('');
    setCoverPreviewUrl('');
    setCoverError('');
    if (coverInputRef.current) coverInputRef.current.value = '';
    setSuggestions([]);
  };

  const handleCoverChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    setCoverUrl('');
    setCoverError('');
    setCoverPreviewUrl('');
    if (!file) return;

    // Blokuj formularz od razu — kompresja i upload razem
    setIsUploadingCover(true);
    setIsCompressingCover(true);

    let fileToUpload: File;
    try {
      fileToUpload = await compressImage(file);
    } catch {
      setCoverError(
        'Nie udało się przetworzyć zdjęcia. Sprawdź, czy plik nie jest uszkodzony.',
      );
      if (coverInputRef.current) coverInputRef.current.value = '';
      setIsCompressingCover(false);
      setIsUploadingCover(false);
      return;
    }

    setIsCompressingCover(false);

    // Pokaż preview już skompresowanego pliku (tego, który trafi na serwer)
    const previewUrl = URL.createObjectURL(fileToUpload);
    setCoverPreviewUrl(previewUrl);

    const formData = new FormData();
    formData.set('file', fileToUpload);
    try {
      const result = await uploadBookCover(formData);
      if (!result.success) {
        URL.revokeObjectURL(previewUrl);
        setCoverPreviewUrl('');
        setCoverError(result.error);
        if (coverInputRef.current) coverInputRef.current.value = '';
        return;
      }
      URL.revokeObjectURL(previewUrl);
      setCoverUrl(result.url);
      setCoverPreviewUrl('');
    } catch {
      URL.revokeObjectURL(previewUrl);
      setCoverPreviewUrl('');
      setCoverError('Nie udało się przesłać zdjęcia. Spróbuj ponownie.');
      if (coverInputRef.current) coverInputRef.current.value = '';
    } finally {
      setIsUploadingCover(false);
    }
  };

  const removeCover = () => {
    setCoverUrl('');
    setCoverPreviewUrl('');
    setCoverError('');
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleAddCurrentToQueue = () => {
    if (isUploadingCover) {
      toast.error('Poczekaj na zakończenie przesyłania zdjęcia.');
      return;
    }
    if (!title.trim() || !author.trim()) {
      toast.error('Wypełnij tytuł, autora i podaj poprawną kwotę.');
      return;
    }
    const priceValidation = parseWholePln(numPrice);
    if (!priceValidation.success) {
      toast.error(priceValidation.error);
      return;
    }

    const newItem: BookSubmissionItem = {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || undefined,
      condition,
      courseCode: courseCode.trim() || undefined,
      price: priceValidation.value,
      coverUrl: coverUrl.trim() || undefined,
    };

    setQueue((prev) => [...prev, newItem]);
    resetCurrentForm();
    toast.success('Podręcznik dodany do listy zgłoszeń.');
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = () => {
    if (isUploadingCover) {
      toast.error('Poczekaj na zakończenie przesyłania zdjęcia.');
      return;
    }
    // If there's an active filled form, include it too
    const finalItems = [...queue];
    if (title.trim() && author.trim() && numPrice > 0) {
      const priceValidation = parseWholePln(numPrice);
      if (!priceValidation.success) {
        toast.error(priceValidation.error);
        return;
      }
      finalItems.push({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        condition,
        courseCode: courseCode.trim() || undefined,
        price: priceValidation.value,
        coverUrl: coverUrl.trim() || undefined,
      });
    }

    if (finalItems.length === 0) {
      toast.error('Dodaj przynajmniej jeden podręcznik przed wysłaniem.');
      return;
    }

    startSubmitting(async () => {
      const res = await submitBooksBatch(finalItems);
      if (res.success) {
        toast.success(
          `Pomyślnie zgłoszono ${res.count} podręcznik(ów) do weryfikacji!`,
        );
        router.push('/profile');
      } else {
        toast.error('Zgłoszenie nie zostało wysłane', {
          description: res.error || 'Wystąpił błąd podczas wysyłania.',
        });
      }
    });
  };

  const totalSellerEarnings =
    queue.reduce((sum, item) => sum + item.price, 0) +
    (numPrice > 0 && title ? numPrice : 0);

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Drugi obieg zaczyna się tutaj</p>
        <h1 className="page-heading mt-2">Wystaw podręcznik</h1>
        <p className="mt-3 text-muted-foreground">
          Dodaj książki, które chcesz przekazać na Targi Książek.
        </p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleAddCurrentToQueue();
          }}
          className="min-w-0 space-y-6 rounded-xl border border-border bg-surface p-5 sm:p-7"
        >
          <div>
            <h2 className="text-lg font-semibold">Dane podręcznika</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pola oznaczone * są wymagane.
            </p>
          </div>
          <div className="relative space-y-2">
            <Label htmlFor="isbn">
              ISBN{' '}
              <span className="font-normal text-muted-foreground">
                (opcjonalnie)
              </span>
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="isbn"
                value={isbn}
                onChange={(event) => handleIsbnChange(event.target.value)}
                placeholder="Zacznij wpisywać numer ISBN książki"
                autoComplete="off"
                aria-describedby="isbn-help"
                className="flex-1"
              />
              <IsbnScanner onScan={handleIsbnChange} />
            </div>
            <p id="isbn-help" className="text-xs text-muted-foreground">
              Podpowiedzi pojawią się po wpisaniu co najmniej 3 znaków.
            </p>
            {isSearchingIsbn && (
              <p role="status" className="text-sm text-sue">
                Wyszukiwanie…
              </p>
            )}
            {foundBook && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-sue"
              >
                <CheckCircle2 className="size-4" />
                Znaleziono książkę. Tytuł i autor zostały uzupełnione.
              </p>
            )}
            {suggestions.length > 0 && (
              <ul className="absolute z-20 max-h-64 w-full overflow-y-auto rounded-xl border bg-surface p-2 shadow-lg">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.isbn}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-3 text-left hover:bg-sue-soft"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <span className="block text-sm font-medium">
                        {suggestion.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.author} · {suggestion.isbn}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł *</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="np. MATeMAtyka 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Autor / autorzy *</Label>
            <Input
              id="author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              required
              placeholder="Imię i nazwisko autora"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="courseCode">Przedmiot</Label>
            <select
              id="courseCode"
              className="w-full border bg-surface px-3 py-2"
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
            >
              {[
                'Język polski',
                'Matematyka',
                'Język angielski',
                'Język niemiecki',
                'Historia',
                'Biologia',
                'Chemia',
                'Fizyka',
                'Geografia',
                'Informatyka',
                'Przedmioty zawodowe',
                'Inne',
              ].map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">
              Stan podręcznika *
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ['IDEALNY', 'Idealny', 'Jak z księgarni'],
                ['BARDZO_DOBRY', 'Bardzo dobry', 'Drobne ślady używania'],
                ['DOBRY', 'Dobry', 'Normalne ślady użytkowania'],
                ['UZYWANY', 'Używany', 'Widoczne ślady, nieliczne notatki'],
              ].map(([value, label, description]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${condition === value ? 'border-green bg-green-soft' : 'border-border hover:bg-elevated'}`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={value}
                    checked={condition === value}
                    onChange={() => setCondition(value)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Książka musi być kompletna i nadawać się do normalnego
              użytkowania. Mocno uszkodzone lub w znacznym stopniu uzupełnione
              egzemplarze nie zostaną przyjęte.
            </p>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="coverFile">
              Zdjęcie okładki{' '}
              <span className="font-normal text-muted-foreground">
                (opcjonalnie)
              </span>
            </Label>
            <div className="rounded-xl border border-dashed border-border bg-elevated p-4">
              <div className="mb-3 flex items-center gap-3">
                <Camera className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Wybierz zdjęcie JPG, PNG lub WebP, maksymalnie 5 MB.
                </p>
              </div>
              <Input
                ref={coverInputRef}
                id="coverFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingCover}
                onChange={handleCoverChange}
              />
              {isUploadingCover && (
                <p role="status" className="mt-3 text-sm text-muted-foreground">
                  {isCompressingCover
                    ? 'Przygotowywanie zdjęcia\u2026'
                    : 'Przesyłanie zdjęcia\u2026'}
                </p>
              )}
              {coverError && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {coverError}
                </p>
              )}
              {(coverPreviewUrl || coverUrl) && (
                <div className="mt-4 flex items-center gap-4">
                  <BookCover
                    title={title || 'Podgląd okładki'}
                    url={coverPreviewUrl || coverUrl}
                    className="h-32 w-24 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removeCover}
                    disabled={isUploadingCover}
                  >
                    Usuń zdjęcie
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Kwota, którą chcesz otrzymać *</Label>
            <div className="relative max-w-xs">
              <Input
                id="price"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={price}
                onChange={(event) =>
                  setPrice(
                    event.target.value === ''
                      ? ''
                      : parseFloat(event.target.value),
                  )
                }
                placeholder="25"
                className="pr-12"
                required
              />
              <span className="absolute right-4 top-3 text-sm text-muted-foreground">
                zł
              </span>
            </div>
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isUploadingCover}
          >
            <Plus className="size-4" />
            Dodaj książkę do listy
          </Button>
        </form>
        <aside className="rounded-xl border border-border bg-elevated p-5 lg:sticky lg:top-24 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Twoje książki
            </h2>
            <span className="rounded-md bg-surface px-2.5 py-1 text-sm text-muted-foreground">
              {queue.length}
            </span>
          </div>
          <div className="my-5 border-y border-border py-5">
            <p className="text-sm text-muted-foreground">
              Potencjalnie otrzymasz
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-green-ink">
              {formatPrice(totalSellerEarnings)}
            </p>
            {title && numPrice > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Suma uwzględnia również książkę w formularzu.
              </p>
            )}
          </div>
          {queue.length === 0 ? (
            <div className="py-5 text-center">
              <BookOpen className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="text-sm font-medium">
                Tutaj pojawią się Twoje książki
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Uzupełnij formularz i dodaj pierwszą do listy.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 space-y-3 overflow-y-auto">
              {queue.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 border-b border-border pb-3"
                >
                  <BookCover
                    title={item.title}
                    url={item.coverUrl}
                    className="h-20 w-14 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Usuń ${item.title} z listy`}
                    onClick={() => handleRemoveFromQueue(index)}
                    className="icon-button shrink-0 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            onClick={handleSubmitAll}
            disabled={
              isSubmitting ||
              isUploadingCover ||
              (queue.length === 0 && (!title || numPrice <= 0))
            }
            className="mt-6 w-full"
          >
            <Send className="size-4" />
            {isSubmitting ? 'Wysyłanie…' : 'Wyślij do akceptacji'}
          </Button>
          <p className="mt-3 rounded-lg border border-border bg-surface-soft px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            W przypadku sprzedaży otrzymasz wskazaną przez siebie kwotę. Cena
            prezentowana w katalogu może uwzględniać opłatę organizacyjną
            Targów. Wystawiając książkę, potwierdzasz jej stan, prawo do jej
            sprzedaży oraz akceptujesz zasady odbioru określone w{' '}
            <Link
              href="/regulamin"
              className="font-medium text-green-ink underline underline-offset-2 hover:text-green-hover"
            >
              Regulaminie
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
