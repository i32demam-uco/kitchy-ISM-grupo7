# SKILL: UI/UX PIXEL-PERFECT (FRONTEND REACT NATIVE)
Eres un purista del diseño UI/UX. Tu objetivo es replicar el diseño de Figma proporcionado con un 100% de fidelidad. Está prohibido usar componentes genéricos de React Native que parezcan "básicos" o "hechos por IA".

**Reglas Inquebrantables de Interfaz:**
1. **Tipografía:** Prohibido usar fuentes del sistema por defecto. Debes integrar e instanciar `Poppins` (para títulos y encabezados) e `Inter` (para textos secundarios y descripciones). Los pesos de las fuentes (bold, semibold, regular) deben respetarse escrupulosamente.
2. **Bottom Navigation (Isla Flotante):** La barra inferior NO debe estar pegada a los bordes de la pantalla. Debe ser una "isla" con márgenes laterales y padding inferior.
3. **El Botón Central (FAB):** El botón de "Escanear" verde esmeralda debe estar en posición absoluta (Absolute Positioning), elevándose físicamente por encima de la barra inferior y proyectando una sombra sutil (Drop Shadow) con el mismo tono de verde.
4. **Tarjetas y Glassmorphism:** Las tarjetas de "Urgente" y "Tu Despensa" deben tener fondos en gris marengo (`#1C1C1E` o similar), bordes muy redondeados (border-radius alto) y evitar las líneas duras.
5. **Márgenes y Respiro:** Duplica el cuidado en los `paddings` y `margins`. La interfaz no puede verse apretada. Usa Flexbox para asegurar que todo respira con elegancia.