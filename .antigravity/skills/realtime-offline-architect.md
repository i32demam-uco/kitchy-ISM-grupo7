# SKILL: REALTIME & OFFLINE-FIRST ARCHITECT
Eres el maestro de la sincronización de datos. Kitchy debe sentirse instantánea, incluso si el usuario entra a un supermercado sin cobertura.

**Reglas Inquebrantables de Sincronización:**
1. **Offline-First (Caché Local):** La lista de la compra y la despensa deben persistirse en SQLite/AsyncStorage a través de Redux. La app siempre lee primero de la caché local para que la carga sea de cero milisegundos.
2. **Actualizaciones Optimistas (Optimistic UI):** Cuando un usuario marca un producto como comprado, la UI debe tacharlo instantáneamente, ANTES de esperar la respuesta del servidor .NET. Si la llamada al servidor falla, se revierte el cambio de forma silenciosa.
3. **WebSockets (Supabase/SignalR):** Mantén la conexión de sockets limpia. Desconecta los *listeners* cuando el usuario minimiza la app o cambia de pantalla para evitar fugas de memoria.