import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';


export async function approveBooksBatch(...args: Parameters<typeof import('@/actions/admin').approveBooksBatch>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').approveBooksBatch>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').approveBooksBatch>>; }
  return (await import('@/actions/admin')).approveBooksBatch(...args);
}

export async function rejectBooksBatch(...args: Parameters<typeof import('@/actions/admin').rejectBooksBatch>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').rejectBooksBatch>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').rejectBooksBatch>>; }
  return (await import('@/actions/admin')).rejectBooksBatch(...args);
}

export async function deleteBook(...args: Parameters<typeof import('@/actions/admin').deleteBook>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').deleteBook>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').deleteBook>>; }
  return (await import('@/actions/admin')).deleteBook(...args);
}

export async function updateBookData(...args: Parameters<typeof import('@/actions/admin').updateBookData>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').updateBookData>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').updateBookData>>; }
  return (await import('@/actions/admin')).updateBookData(...args);
}

export async function adminCreateBook(...args: Parameters<typeof import('@/actions/admin').adminCreateBook>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').adminCreateBook>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').adminCreateBook>>; }
  return (await import('@/actions/admin')).adminCreateBook(...args);
}

export async function fulfillOrder(...args: Parameters<typeof import('@/actions/admin').fulfillOrder>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').fulfillOrder>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').fulfillOrder>>; }
  return (await import('@/actions/admin')).fulfillOrder(...args);
}

export async function cancelReservation(...args: Parameters<typeof import('@/actions/admin').cancelReservation>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').cancelReservation>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').cancelReservation>>; }
  return (await import('@/actions/admin')).cancelReservation(...args);
}

export async function setSystemSetting(...args: Parameters<typeof import('@/actions/admin').setSystemSetting>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').setSystemSetting>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').setSystemSetting>>; }
  return (await import('@/actions/admin')).setSystemSetting(...args);
}

export async function savePriceMarkups(...args: Parameters<typeof import('@/actions/admin').savePriceMarkups>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').savePriceMarkups>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').savePriceMarkups>>; }
  return (await import('@/actions/admin')).savePriceMarkups(...args);
}

export async function adminCreateOfflineUser(...args: Parameters<typeof import('@/actions/admin').adminCreateOfflineUser>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').adminCreateOfflineUser>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').adminCreateOfflineUser>>; }
  return (await import('@/actions/admin')).adminCreateOfflineUser(...args);
}

export async function adminUpdateUserProfile(...args: Parameters<typeof import('@/actions/admin').adminUpdateUserProfile>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').adminUpdateUserProfile>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').adminUpdateUserProfile>>; }
  return (await import('@/actions/admin')).adminUpdateUserProfile(...args);
}

export async function deleteUser(...args: Parameters<typeof import('@/actions/admin').deleteUser>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').deleteUser>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').deleteUser>>; }
  return (await import('@/actions/admin')).deleteUser(...args);
}

export async function markBooksPaid(...args: Parameters<typeof import('@/actions/admin').markBooksPaid>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').markBooksPaid>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').markBooksPaid>>; }
  return (await import('@/actions/admin')).markBooksPaid(...args);
}

export async function setReservationFulfillmentStatus(...args: Parameters<typeof import('@/actions/admin').setReservationFulfillmentStatus>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').setReservationFulfillmentStatus>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').setReservationFulfillmentStatus>>; }
  return (await import('@/actions/admin')).setReservationFulfillmentStatus(...args);
}

export async function sellEntireReservation(...args: Parameters<typeof import('@/actions/admin').sellEntireReservation>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').sellEntireReservation>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').sellEntireReservation>>; }
  return (await import('@/actions/admin')).sellEntireReservation(...args);
}

export async function setUserBlocked(...args: Parameters<typeof import('@/actions/admin').setUserBlocked>): Promise<Awaited<ReturnType<typeof import('@/actions/admin').setUserBlocked>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/admin').setUserBlocked>>; }
  return (await import('@/actions/admin')).setUserBlocked(...args);
}
