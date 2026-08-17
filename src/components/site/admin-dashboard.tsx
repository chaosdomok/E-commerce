'use client';

import { useActionState, useMemo, useState, useRef, startTransition } from 'react';
import { BookOpen, CheckCircle2, PackageCheck, ShieldCheck, Camera, Loader2, X } from 'lucide-react';
import { addBookAction, fulfillOrder, cancelReservation } from '@/actions/admin';
import { extractBookData } from '@/actions/extract-book-data';
import { COURSE_OPTIONS, CONDITION_OPTIONS } from '@/lib/admin-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

type ReservationBook = Book & {
  reserved_by_profile?: {
    full_name: string | null;
    class: string | null;
    school: string | null;
  } | null;
};

interface AdminDashboardProps {
  reservations: ReservationBook[];
}

const initialState = { success: '', error: '' };

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Maximum dimensions to ensure small file size
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback if canvas fails
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\\.[^/.]+$/, "") + ".webp", {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              resolve(file); // fallback
            }
          },
          'image/webp',
          0.8 // 80% quality for optimal size/quality ratio
        );
      };
      img.onerror = () => resolve(file); // fallback
    };
    reader.onerror = () => resolve(file); // fallback
  });
};

export function AdminDashboard({ reservations }: AdminDashboardProps) {
  const [formState, formAction, isPending] = useActionState(addBookAction, initialState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const file = formData.get('cover') as File;
    if (file && file.size > 0 && file.type.startsWith('image/')) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        formData.set('cover', compressed);
      } catch (e) {
        console.error('Image compression failed', e);
      } finally {
        setIsCompressing(false);
      }
    }
    // Proceed with the original form action wrapped in startTransition
    startTransition(() => {
      formAction(formData);
    });
  };

  const reservationRows = useMemo(() => reservations ?? [], [reservations]);

  const handleFulfill = async (bookId: string) => {
    setPendingId(bookId);
    try {
      const result = await fulfillOrder(bookId);
      
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          toast.success(result.message ?? 'Rezerwacja zrealizowana');
        } else {
          toast.error(result.error ?? 'Błąd podczas realizacji');
        }
      } else {
        toast.error('Wystąpił nieoczekiwany błąd');
      }
    } catch (error) {
      console.error('Error in handleFulfill:', error);
      toast.error('Wystąpił nieoczekiwany błąd');
    } finally {
      setPendingId(null);
    }
  };

  const handleCancel = async (bookId: string) => {
    setPendingId(bookId);
    try {
      const result = await cancelReservation(bookId);
      
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          toast.success(result.message ?? 'Rezerwacja anulowana');
        } else {
          toast.error(result.error ?? 'Błąd podczas anulowania');
        }
      } else {
        toast.error('Wystąpił nieoczekiwany błąd');
      }
    } catch (error) {
      console.error('Error in handleCancel:', error);
      toast.error('Wystąpił nieoczekiwany błąd');
    } finally {
      setPendingId(null);
    }
  };

  const handleExtract = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setExtractionError('Proszę najpierw wybrać zdjęcie okładki.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const formData = new FormData();
      formData.append('cover', file);

      const result = await extractBookData(formData);

      if (result.success === true) {
        // Auto-fill form fields
        const form = fileInputRef.current?.closest('form');
        if (form) {
          const titleField = form.querySelector<HTMLInputElement>('[name="title"]');
          const authorField = form.querySelector<HTMLInputElement>('[name="author"]');
          const courseField = form.querySelector<HTMLSelectElement>('[name="course_code"]');
          const conditionField = form.querySelector<HTMLSelectElement>('[name="condition"]');
          const priceField = form.querySelector<HTMLInputElement>('[name="price"]');

          if (titleField) titleField.value = result.data.title;
          if (authorField) authorField.value = result.data.author;
          if (courseField) courseField.value = result.data.course_code;
          if (conditionField) conditionField.value = result.data.condition;
          if (priceField) priceField.value = result.data.suggested_price.toString();
        }

        setToastMessage('Dane zostały wydobyte ze zdjęcia i wypełnione w formularzu.');
      } else {
        setExtractionError(result.error ?? 'Nie udało się wydobyć danych.');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError('Wystąpił błąd podczas przetwarzania zdjęcia.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-sue">Panel samorządu</p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Zarządzaj książkami i rezerwacjami</h1>
            <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm text-zinc-400">Dodawaj nowe książki do katalogu oraz realizuj przyjęte rezerwacje.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-sue/20 bg-sue/10 px-3 py-2 text-xs sm:text-sm font-medium text-sue">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Zalogowano jako administrator
          </div>
        </div>
      </div>

      <Tabs defaultValue="books" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900/70">
          <TabsTrigger value="books" className="data-[state=active]:bg-sue data-[state=active]:text-white text-xs sm:text-sm">Dodaj książkę</TabsTrigger>
          <TabsTrigger value="reservations" className="data-[state=active]:bg-sue data-[state=active]:text-white text-xs sm:text-sm">Rezerwacje</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-white text-lg sm:text-xl">Dodaj nową książkę</CardTitle>
              <CardDescription className="text-zinc-400 text-xs sm:text-sm">Wgraj okładkę do magazynu Supabase Storage i dodaj egzemplarz do katalogu.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title" className="text-zinc-300">Tytuł</Label>
                  <Input id="title" name="title" className="w-full border-zinc-800 bg-zinc-950/70 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author" className="text-zinc-300">Autor</Label>
                  <Input id="author" name="author" className="w-full border-zinc-800 bg-zinc-950/70 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-zinc-300">Cena</Label>
                  <Input id="price" name="price" type="number" min="0" step="0.01" className="w-full border-zinc-800 bg-zinc-950/70 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course_code" className="text-zinc-300">Przedmiot</Label>
                  <Select id="course_code" name="course_code" defaultValue="Matematyka" className="w-full border-zinc-800 bg-zinc-950/70 text-white">
                    {COURSE_OPTIONS.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition" className="text-zinc-300">Stan</Label>
                  <Select id="condition" name="condition" defaultValue="DOBRY" className="w-full border-zinc-800 bg-zinc-950/70 text-white">
                    {CONDITION_OPTIONS.map((condition) => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cover" className="text-zinc-300">Okładka</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                      ref={fileInputRef}
                      id="cover" 
                      name="cover" 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="w-full border-zinc-800 bg-zinc-950/70 text-white file:mr-4 file:rounded-full file:border-0 file:bg-sue/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sue flex-1" 
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleExtract}
                      disabled={isExtracting}
                      className="w-full sm:w-auto border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Przetwarzam…
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Wypełnij automatycznie</span>
                          <span className="sm:hidden">Auto</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto bg-sue text-white hover:bg-sue-deep" disabled={isPending || isCompressing}>
                    {isCompressing ? 'Kompresowanie...' : isPending ? 'Dodaję…' : 'Dodaj książkę'}
                  </Button>
                </div>
                {extractionError && (
                  <div className="md:col-span-2">
                    <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                      <AlertTitle>Ostrzeżenie</AlertTitle>
                      <AlertDescription>{extractionError}</AlertDescription>
                    </Alert>
                  </div>
                )}
                {(formState.error || formState.success) && (
                  <div className="md:col-span-2">
                    <Alert className={formState.error ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'}>
                      <AlertTitle>{formState.error ? 'Błąd' : 'Sukces'}</AlertTitle>
                      <AlertDescription>{formState.error || formState.success}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-white text-lg sm:text-xl">Rezerwacje do realizacji</CardTitle>
              <CardDescription className="text-zinc-400 text-xs sm:text-sm">Przeglądaj rezerwacje i oznaczaj je jako opłacone oraz wydane.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {toastMessage ? (
                <Alert className="mb-4 border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                  <AlertTitle>Gotowe</AlertTitle>
                  <AlertDescription>{toastMessage}</AlertDescription>
                </Alert>
              ) : null}
              {reservationRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-16 text-center">
                  <BookOpen className="h-10 w-10 text-zinc-600" />
                  <p className="mt-4 text-lg font-semibold text-zinc-200">Brak aktywnych rezerwacji</p>
                  <p className="mt-2 text-sm text-zinc-500">Gdy uczniowie zarezerwują książki, pojawią się tutaj.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 bg-zinc-950/80 hover:bg-zinc-950/80">
                        <TableHead className="text-zinc-400 text-xs sm:text-sm whitespace-nowrap">Książka</TableHead>
                        <TableHead className="text-zinc-400 text-xs sm:text-sm whitespace-nowrap">Uczeń</TableHead>
                        <TableHead className="text-zinc-400 text-xs sm:text-sm whitespace-nowrap">Cena</TableHead>
                        <TableHead className="text-zinc-400 text-xs sm:text-sm whitespace-nowrap">Akcja</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservationRows.map((reservation) => (
                        <TableRow key={reservation.id} className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60">
                          <TableCell className="text-xs sm:text-sm">
                            <div className="space-y-1">
                              <p className="font-medium text-white">{reservation.title}</p>
                              <p className="text-xs sm:text-sm text-zinc-500">{reservation.course_code ?? 'Brak przedmiotu'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="space-y-1">
                              <p className="font-medium text-white">{reservation.reserved_by_profile?.full_name ?? '—'}</p>
                              <p className="text-xs sm:text-sm text-zinc-500">{reservation.reserved_by_profile?.class ?? '—'} • {reservation.reserved_by_profile?.school ?? '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-white text-xs sm:text-sm whitespace-nowrap">{reservation.price} zł</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs"
                                onClick={() => handleFulfill(reservation.id)}
                                disabled={pendingId === reservation.id}
                              >
                                {pendingId === reservation.id ? 'Przetwarzanie…' : 'Wydano'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs"
                                onClick={() => handleCancel(reservation.id)}
                                disabled={pendingId === reservation.id}
                              >
                                {pendingId === reservation.id ? 'Przetwarzanie…' : 'Anuluj'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
