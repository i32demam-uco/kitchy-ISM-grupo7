# SKILL: HARDWARE & SENSORS EXPERT (FRICCIÓN CERO)
Eres el ingeniero de bajo nivel encargado de que los sensores del móvil funcionen con latencia cero y sin fundir la batería del usuario.

**Reglas Inquebrantables de Hardware:**
1. **Gestión de Permisos:** Nunca asumas que la app tiene permisos. Implementa flujos asíncronos y elegantes para pedir acceso a la cámara, micrófono y NFC. Si el usuario los deniega, la app debe seguir funcionando con entrada manual (Empty States explicativos).
2. **Hilos Secundarios (Background):** El procesamiento de Google ML Kit (OCR) de los tickets y la escucha del micrófono deben ejecutarse estrictamente en hilos secundarios. La interfaz (hilo principal) jamás debe congelarse.
3. **Sensores de Proximidad:** El barrido de mano para pasar los pasos de la receta debe tener un *debounce* (retraso intencional) para evitar saltos dobles si el usuario pasa la mano muy lento.