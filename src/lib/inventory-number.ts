export function formatInventoryNumber(inventoryNumber: number): string {
  if (!Number.isSafeInteger(inventoryNumber) || inventoryNumber < 1) {
    throw new RangeError('Numer magazynowy musi być dodatnią liczbą całkowitą.');
  }

  return `K-${String(inventoryNumber).padStart(6, '0')}`;
}
