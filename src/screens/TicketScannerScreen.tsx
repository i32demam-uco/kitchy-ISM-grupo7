import React from 'react';
import { ScannerScreen } from './ScannerScreen';

/**
 * TicketScannerScreen - Alias retrocompatible para ScannerScreen (Fricción Cero).
 * Incorpora detección híbrida: Ticket OCR + Códigos de Barras (Open Food Facts) + NFC.
 */
export const TicketScannerScreen: React.FC = () => {
  return <ScannerScreen />;
};

export default TicketScannerScreen;
