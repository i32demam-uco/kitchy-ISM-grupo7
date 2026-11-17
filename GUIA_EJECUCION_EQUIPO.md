# 📱 Guía Definitiva de Instalación y Ejecución de Kitchy en Dispositivo Móvil Físico (Android)

Esta guía contiene el paso a paso detallado para configurar tu entorno en **Windows**, conectar tu **teléfono Android físico por cable USB** (sin necesidad de usar el emulador pesado de Android Studio) y compilar/ejecutar **Kitchy** a la primera sin errores.

---

## 📋 Índice
1. [Requisitos Previos de Software](#1-requisitos-previos-de-software)
2. [Configuración de Variables de Entorno (PATH, JAVA_HOME, ANDROID_HOME)](#2-configuración-de-variables-de-entorno)
3. [Configuración del Teléfono Android Físico](#3-configuración-del-teléfono-android-físico)
4. [Instalación del Proyecto Kitchy](#4-instalación-del-proyecto-kitchy)
5. [Ejecución en el Dispositivo](#5-ejecución-en-el-dispositivo)
6. [Resolución de Problemas Frecuentes (Troubleshooting)](#6-resolución-de-problemas-frecuentes)

---

## 1. Requisitos Previos de Software

Debes tener instaladas las siguientes herramientas en tu ordenador con Windows:

### A. Git
- Descárgalo desde [git-scm.com](https://git-scm.com/) e instálalo con las opciones por defecto.

### B. Node.js
- Descarga e instala la versión **LTS** (versión 20 o 22 recomendada) desde [nodejs.org](https://nodejs.org/).
- Durante el instalador de Windows, asegúrate de dejar marcada la opción de añadir Node al `PATH`.

### C. Java Development Kit (JDK 17)
- React Native requiere JDK 17. Puedes descargarlo de [Eclipse Adoptium (Temurin 17)](https://adoptium.net/temurin/releases/?version=17) o el instalador oficial de Oracle JDK 17.
- La ruta típica de instalación suele ser: `C:\Program Files\Eclipse Adoptium\jdk-17...` o `C:\Program Files\Java\jdk-17`.

### D. Android SDK y Platform-Tools (Android Studio)
- Descarga e instala [Android Studio](https://developer.android.com/studio).
- **Nota**: Solo usaremos Android Studio para que descargue el SDK de Android y sus herramientas (`adb.exe`). **NO** necesitas crear ni abrir ningún emulador virtual.
- Una vez instalado Android Studio:
  1. Ábrelo y ve a **More Actions** $\rightarrow$ **SDK Manager** (o desde Ajustes / Settings $\rightarrow$ Languages & Frameworks $\rightarrow$ Android SDK).
  2. En la pestaña **SDK Platforms**, asegúrate de tener marcado **Android 14 (API 34)** o superior.
  3. En la pestaña **SDK Tools**, asegúrate de tener marcadas:
     - ✅ **Android SDK Build-Tools**
     - ✅ **Android SDK Platform-Tools** (aquí está el comando `adb`)
     - ✅ **Android SDK Command-line Tools (latest)**
  4. Pulsa **Apply** / **OK** para que se descarguen.
- Por defecto, el SDK se instala en:
  `C:\Users\<TU_NOMBRE_DE_USUARIO>\AppData\Local\Android\Sdk`

---

## 2. Configuración de Variables de Entorno

Este es el paso donde la mayoría de las personas se atasca si falta algo en el `Path`.

### ¿Cómo abrir las Variables de Entorno en Windows?
1. Pulsa la tecla **Windows** en tu teclado.
2. Escribe: `variables de entorno`.
3. Haz clic en **"Editar las variables de entorno del sistema"**.
4. En la ventana que se abre, pulsa en el botón abajo a la derecha: **"Variables de entorno..."**.

---

### Paso 2.1: Crear la variable `JAVA_HOME`
1. En el apartado inferior (**Variables del sistema**) o superior (**Variables de usuario**), pulsa en **"Nueva..."**.
2. **Nombre de la variable:** `JAVA_HOME`
3. **Valor de la variable:** La ruta de tu JDK (sin la carpeta `bin`).
   - Ejemplo: `C:\Program Files\Java\jdk-17` (o la versión que hayas instalado).
4. Pulsa **Aceptar**.

---

### Paso 2.2: Crear la variable `ANDROID_HOME`
1. Pulsa en **"Nueva..."**.
2. **Nombre de la variable:** `ANDROID_HOME`
3. **Valor de la variable:** La ruta a tu SDK de Android.
   - Típicamente: `C:\Users\<TU_USUARIO>\AppData\Local\Android\Sdk`
   *(Sustituye `<TU_USUARIO>` por tu usuario real de Windows)*.
4. Pulsa **Aceptar**.

---

### Paso 2.3: Añadir las herramientas al `Path`
1. En la lista de variables, busca la variable llamada **`Path`** (o `PATH`) y haz doble clic sobre ella (o selecciónala y pulsa **"Editar..."**).
2. Haz clic en el botón **"Nuevo"** y añade cada una de las siguientes líneas:
   - `%JAVA_HOME%\bin`
   - `%ANDROID_HOME%\platform-tools`
3. Pulsa **Aceptar** en todas las ventanas abiertas para guardar los cambios.

---

### Paso 2.4: Comprobar que todo está bien configurado
> ⚠️ **Importante**: Cierra cualquier terminal o PowerShell que tuvieras abierta antes de este paso para que reconozca los nuevos PATHs.

Abre una **NUEVA ventana de PowerShell o Símbolo del Sistema (CMD)** y ejecuta uno por uno estos comandos:

```powershell
node -v
```
*(Debe mostrar la versión de Node, ej. `v20.x.x` o `v22.x.x`)*

```powershell
java -version
```
*(Debe mostrar información del compilador de Java)*

```powershell
adb version
```
*(Debe mostrar `Android Debug Bridge version 1.0.41...`)*

👉 Si `adb` no se reconoce, revisa que la ruta `platform-tools` esté bien escrita en tu `Path` y que hayas abierto una terminal nueva.

---

## 3. Configuración del Teléfono Android Físico

Vamos a usar tu propio teléfono conectado por cable USB.

### Paso 3.1: Activar las Opciones de Desarrollador
1. En tu móvil, abre la app de **Ajustes** (Configuración).
2. Entra en **"Acerca del teléfono"** (o "Información del teléfono" / "Información de software").
3. Localiza el campo **"Número de compilación"**:
   - En móviles **Xiaomi / Redmi / POCO**: se llama **"Versión de MIUI"** o **"Versión de OS"**.
   - En móviles **Samsung**: está dentro de "Información de software" $\rightarrow$ "Número de compilación".
4. Toca ese texto **7 veces seguidas rápidamente**.
5. Verás un mensaje en pantalla que dice: *¡Ya eres desarrollador!* (o te pedirá el PIN de tu móvil para confirmar).

---

### Paso 3.2: Activar la Depuración por USB
1. Vuelve al menú principal de **Ajustes**.
2. Entra en **"Sistema"** $\rightarrow$ **"Opciones para desarrolladores"** (en Xiaomi está en **"Ajustes adicionales"** $\rightarrow$ **"Opciones de desarrollador"**).
3. Busca y activa el interruptor:
   - ✅ **Depuración por USB** (USB Debugging).
4. ⚠️ **Si tu móvil es Xiaomi, Redmi o POCO**, debes activar además estas dos opciones adicionales:
   - ✅ **Instalar vía USB** (Install via USB).
   - ✅ **Depuración USB (Ajustes de seguridad)** (USB debugging security settings) — *es posible que te pida iniciar sesión con tu cuenta Mi para activarlo*.

---

### Paso 3.3: Conectar el teléfono al PC por cable USB
1. Conecta el teléfono al ordenador mediante el cable USB.
2. Si en el móvil te sale un menú de cómo conectar el USB, selecciona **"Transferencia de archivos"** (MTP).
3. En la pantalla del teléfono te aparecerá una ventana emergente:
   > **"¿Permitir depuración por USB?"**
   > *La huella digital de la clave del equipo es: XX:XX:XX...*
4. Marca la casilla **☑️ Permitir siempre desde este equipo** y pulsa **Aceptar**.

---

### Paso 3.4: Verificar la conexión en el PC
En tu terminal del ordenador, escribe:

```powershell
adb devices
```

**Resultado esperado:**
```text
List of devices attached
a7c8b210    device
```

- Si pone **`device`** al lado del código de tu teléfono: **¡Conexión perfecta!** Ya estás listo.
- Si pone **`unauthorized`**: Mira la pantalla de tu móvil y pulsa "Aceptar" en la ventana de depuración USB.
- Si la lista sale **vacía**: Cambia de puerto USB, prueba con otro cable o comprueba que la depuración USB sigue activa en el móvil.

---

## 4. Instalación del Proyecto Kitchy

1. Abre tu terminal en la carpeta donde quieras clonar el proyecto (por ejemplo `C:\`):
   ```bash
   git clone <URL_DEL_REPOSITORIO_GIT>
   cd kitchy-ISM-grupo7
   ```

2. Instala los paquetes y librerías de dependencias:
   ```bash
   npm install
   ```

---

## 5. Ejecución en el Dispositivo

Para trabajar cómodamente, mantendremos **2 terminales abiertas**:

### Terminal 1: Servidor Metro Bundler
En la raíz del proyecto (`kitchy-ISM-grupo7`):
```bash
npm start
```
*Deja esta terminal abierta y corriendo. Aquí verás los logs de React Native y la recarga en caliente (Fast Refresh).*

---

### Terminal 2: Túnel de conexión y Compilación

1. **Crear el puente de red directo con tu móvil** (fundamental para que no dependas de tener la misma WiFi ni configurar IPs):
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
   *(Este comando le dice a tu teléfono que cuando busque la app en `localhost:8081`, se comunique con el Metro Bundler de tu PC a través del cable USB).*

2. **Compilar e instalar la app en tu teléfono**:
   ```bash
   npm run android
   ```
   *(O también: `npx react-native run-android`)*.

Gradle compilará el proyecto por primera vez (tardará unos minutos la primera vez mientras descarga librerías). Cuando termine, verás cómo se instala la app en tu teléfono físico y se abre automáticamente en tu pantalla.

---

## 6. Resolución de Problemas Frecuentes (Troubleshooting)

### Error 1: *"adb no se reconoce como un comando interno o externo"*
- **Causa**: No añadiste `%ANDROID_HOME%\platform-tools` a tu variable de entorno `Path`, o no reiniciaste la terminal.
- **Solución**: Revisa el [Paso 2.3](#paso-23-añadir-las-herramientas-al-path), guarda y abre una consola nueva.

### Error 2: *"Unable to load script from assets / could not connect to development server"* (Pantalla roja en el móvil)
- **Causa**: El móvil no llega al servidor Metro que corre en tu PC.
- **Solución**:
  1. Con el servidor Metro corriendo en la Terminal 1 (`npm start`), ejecuta en la Terminal 2:
     ```bash
     adb reverse tcp:8081 tcp:8081
     ```
  2. En el móvil, agita el teléfono o presiona dos veces la tecla `R` en la terminal de Metro para recargar la app.

### Error 3: *"INSTALL_FAILED_USER_RESTRICTED"* (Común en Xiaomi / Redmi / POCO)
- **Causa**: El sistema MIUI bloquea la instalación de aplicaciones por USB de terceros por seguridad.
- **Solución**: En tu móvil, ve a *Opciones de desarrollador* y activa **"Instalar vía USB"** y **"Depuración USB (ajustes de seguridad)"**.

### Error 4: *"SDK location not found"*
- **Causa**: Gradle no sabe dónde está instalado el SDK de Android.
- **Solución**:
  1. Crea un archivo llamado `local.properties` dentro de la carpeta `android/` (`kitchy-ISM-grupo7/android/local.properties`).
  2. Escribe dentro la ruta a tu SDK con dobles barras invertidas o barras normales:
     ```properties
     sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
     ```

### Error 5: Limpieza rápida si la compilación de Gradle se queda atascada
Si en algún momento una compilación falla o se queda corrupta, haz una limpieza limpia:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

---
¡Listo! Siguiendo estos pasos, Kitchy funcionará fluidamente en tu teléfono Android físico con sensores, cámara para OCR y hardware en tiempo real.
